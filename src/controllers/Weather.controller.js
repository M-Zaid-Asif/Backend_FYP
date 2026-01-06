import axios from "axios";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const getCurrentWeather = asyncHandler(async (req, res) => {
    const { lat, lon, city } = req.query;
    const apiKey = process.env.WEATHER_API_KEY;

    try {
        let locationParam = (lat && lon) ? `${lat},${lon}` : (city || "Islamabad");

        // 1. Get the Weather Data (Visual Crossing)
        const weatherUrl = `${process.env.WEATHER_BASE_URL}/${locationParam}/next7days?unitGroup=metric&include=days,current&key=${apiKey}&contentType=json`;
        const weatherRes = await axios.get(weatherUrl);
        const weatherData = weatherRes.data;

        // 2. Get the City Name (BigDataCloud - only if we have coordinates)
        let cityName = city || "Islamabad"; 
        if (lat && lon) {
            const geoRes = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
            cityName = geoRes.data.city || geoRes.data.locality || cityName;
        }

        if (!weatherData) {
            throw new ApiError(404, "Weather data not found");
        }

        // 3. Map Current Data using cityName for location
        const currentData = {
            location: cityName, // Use the clean name we fetched
            temp: weatherData.currentConditions.temp,
            conditions: weatherData.currentConditions.conditions,
            windspeed: weatherData.currentConditions.windspeed,
            humidity: weatherData.currentConditions.humidity
        };

        // 4. Map 7-Day Forecast Data
        const forecastData = weatherData.days.slice(0, 7).map(day => ({
            date: day.datetime,
            temp: day.temp,
            conditions: day.conditions,
            icon: day.icon 
        }));

        // 5. Return both in one response
        return res.status(200).json(
            new ApiResponse(200, {
                current: currentData,
                forecast: forecastData
            }, "Weather and 7-day forecast updated successfully")
        );
    } catch (error) {
        throw new ApiError(500, error?.message || "Weather sync failed");
    }
});

export { getCurrentWeather };