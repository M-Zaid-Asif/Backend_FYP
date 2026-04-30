import axios from "axios";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

// Weather Information
const getCurrentWeather = asyncHandler(async (req, res) => {
    const { lat, lon, city } = req.query;
    const apiKey = process.env.WEATHER_API_KEY;
    const baseUrl = process.env.WEATHER_BASE_URL;

    if (!apiKey) {
        throw new ApiError(500, "Server configuration error: Missing API Key");
    }

    try {
        let locationParam = (lat && lon) ? `${lat},${lon}` : (city || "Islamabad");
        
        // Construct the URL - ensure we include current and days
        const weatherUrl = `${baseUrl}/${locationParam}/next7days?unitGroup=metric&include=days,current&key=${apiKey}&contentType=json`;

        const weatherRes = await axios.get(weatherUrl);
        const weatherData = weatherRes.data;

        // Reverse Geocoding
        let cityName = city || "Islamabad"; 
        if (lat && lon) {
            try {
                const geoRes = await axios.get(
                    `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`,
                    { timeout: 2000 }
                );
                cityName = geoRes.data.city || geoRes.data.locality || cityName;
            } catch (geoErr) {
                // Fallback handled by cityName variable initialization
            }
        }

        if (!weatherData?.currentConditions) {
            throw new ApiError(404, "Weather data unavailable from provider.");
        }

        // Map Current Data (Added humidity and precip)
        const currentData = {
            location: cityName,
            temp: weatherData.currentConditions.temp ?? 0,
            conditions: weatherData.currentConditions.conditions ?? "Clear",
            windspeed: weatherData.currentConditions.windspeed ?? 0,
            humidity: weatherData.currentConditions.humidity ?? 0,
            precip: weatherData.currentConditions.precip ?? 0, // Current rain intensity
        };

        // Map Forecast Data
        const forecastData = (weatherData.days || []).slice(0, 7).map(day => ({
            datetime: day.datetime,
            temp: day.temp ?? 0,
            tempmax: day.tempmax ?? 0,
            feelslike: day.feelslike ?? 0,
            conditions: day.conditions ?? "Clear",
            precip: day.precip ?? 0,           // Rainfall in mm
            precipprob: day.precipprob ?? 0,   // Probability of rain %
            icon: day.icon 
        }));

        return res.status(200).json(
            new ApiResponse(200, {
                current: currentData,
                days: forecastData // Named 'days' to match the WeatherCard.jsx expectations
            }, "Weather and 7-day forecast updated successfully")
        );

    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.message || "Weather sync failed internally"
        });
    }
});

// Map Configuration
const getMapConfig = asyncHandler(async (req, res) => {
    const { lat, lon } = req.query;

    const config = {

        // Center coordinates [lat, lng]
        center: [parseFloat(lat) || 33.6844, parseFloat(lon) || 73.0479],
        zoom: 13,

        // Using CartoDB Dark Matter tiles
        tileUrl: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    };

    return res.status(200).json(new ApiResponse(200, config, "Map config fetched"));
});

export { getCurrentWeather, getMapConfig };