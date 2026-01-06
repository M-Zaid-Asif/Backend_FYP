import axios from "axios";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const getCurrentWeather = asyncHandler(async (req, res) => {
    // 1. Get lat, lon, or city from the request query
    const { lat, lon, city } = req.query;
    const apiKey = process.env.WEATHER_API_KEY;

    try {
        // 2. Determine the location parameter: 
        // Prioritize coordinates (lat,lon) if available, otherwise use city name
        let locationParam;
        
        if (lat && lon) {
            locationParam = `${lat},${lon}`;
        } else {
            locationParam = city || "Islamabad";
        }

        // 3. Construct the Visual Crossing Timeline URL
        const url = `${process.env.WEATHER_BASE_URL}/${locationParam}?unitGroup=metric&include=current&key=${apiKey}&contentType=json`;
        
        const response = await axios.get(url);
        const data = response.data;

        if (!data) {
            throw new ApiError(404, "Weather data not found for this location");
        }

        const geoRes = await axios.get(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
const cityName = geoRes.data.city || geoRes.data.locality || "Islamabad";

        // 4. Map the data for your Rescue Link Dashboard
        const weatherInfo = {
            location: cityName,
            temp: data.currentConditions.temp,
            humidity: data.currentConditions.humidity,
            conditions: data.currentConditions.conditions,
            description: data.description, 
            windspeed: data.currentConditions.windspeed,
            uvindex: data.currentConditions.uvindex
        };

        return res.status(200).json(
            new ApiResponse(200, weatherInfo, "Weather updated successfully")
        );
    } catch (error) {
        throw new ApiError(500, error?.message || "Failed to fetch weather data");
    }
});

export { getCurrentWeather };