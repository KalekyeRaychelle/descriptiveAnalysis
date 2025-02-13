const fs = require("fs");
const csv = require("csv-parser");
const stringify = require("csv-stringify").stringify;
require("dotenv").config();
const axios = require("axios");

const results = [];
let genreMap = {};
async function fetchGenreList() {
    const movieUrl = `https://api.themoviedb.org/3/genre/movie/list?api_key=${process.env.TMDB_API_KEY}`;
    const tvUrl = `https://api.themoviedb.org/3/genre/tv/list?api_key=${process.env.TMDB_API_KEY}`;

    try {
        const [movieResponse, tvResponse] = await Promise.all([
            axios.get(movieUrl),
            axios.get(tvUrl),
        ]);

    //movie genres
        movieResponse.data.genres.forEach(genre => {
            genreMap[genre.id] = genre.name;
        });

        //  TV genres
        tvResponse.data.genres.forEach(genre => {
            genreMap[genre.id] = genre.name;
        });

        console.log("Genre Map Fetched:", JSON.stringify(genreMap, null, 2)); 
    } catch (error) {
        console.error("Error fetching genre lists: ", error);
    }
}



function cleanTitle(title) {
    return title
    .replace(/\b(S\d+|Season\s*\d+|Episode\s*\d+|Limited Series)\b/gi, "") 
    .replace(/[:]\s*/g, ": ") 
    .replace(/\s+/g, " ")
    .trim()
    .split(":")[0] 
    .trim();
}

// Fetch Movie Genres
async function fetchMovieGenres(movieTitle) {
    const url =` https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(movieTitle)}&api_key=${process.env.TMDB_API_KEY}`;
    try {
        const response = await axios.get(url);
        console.log(`Movie API Response for "${movieTitle}":`, JSON.stringify(response.data, null, 2));

        if (response.data.results.length > 0) {
            const genreIds = response.data.results[0].genre_ids;
            console.log(`Movie Genre IDs for "${movieTitle}":`, genreIds); // Debugging step

            return genreIds.map(id => genreMap[id] || "Unknown").join(", ");
        }
        return "Unknown";
    } catch (error) {
        console.error("Error fetching movie genres: ", error);
        return "Unknown";
    }
}

// Fetch TV Show Genres
async function fetchTVGenres(tvTitle) {
    console.log("🔍 Genre Map Before Lookup:", JSON.stringify(genreMap, null, 2));

    const url = `https://api.themoviedb.org/3/search/tv?query=${encodeURIComponent(tvTitle)}&api_key=${process.env.TMDB_API_KEY}`;
    try {
        const response = await axios.get(url);
        console.log(`TV API Response for "${tvTitle}":`, JSON.stringify(response.data, null, 2));

        if (response.data.results.length > 0) {
            const genreIds = response.data.results[0].genre_ids;
            console.log(`TV Genre IDs for "${tvTitle}":`, genreIds);  // Debugging step

            // Make sure genreMap is being used correctly
            const genreNames = genreIds.map(id => genreMap[id] || `Unknown (${id})`);

            console.log(`Mapped Genres for "${tvTitle}":`, genreNames); // Debugging step
            return genreNames.join(", ");
        }
        return "Unknown";
    } catch (error) {
        console.error("Error fetching TV genres: ", error);
        return "Unknown";
    }
}

// Determine if Title is a Movie or TV Show
async function fetchGenres(title) {
    title = cleanTitle(title);
    let genres = await fetchMovieGenres(title);
    if (genres === "Unknown") {
        genres = await fetchTVGenres(title);
    }
    return genres;
}

// Read CSV & Process Each Title
async function processNetflixHistory() {
    await fetchGenreList();  // ✅ Ensures genres are fetched before proceeding

    fs.createReadStream("SampleNetflixHistory.csv")
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", async () => {
            console.log("Read Sample Viewing History...");

            for (let row of results) {
                row.genres = await fetchGenres(row.Title || row["Title"]);
                console.log(` Fetched genres for: ${row.Title} -> ${row.genres}`);
            }

            writeUpdatedCSV(results);
        });
}


// Write Updated CSV
function writeUpdatedCSV(data) {
    const writableStream = fs.createWriteStream("updated-netflix.csv");
    const columns = Object.keys(data[0]);
    const stringifier = stringify({ header: true, columns });

    data.forEach(row => stringifier.write(row));
    stringifier.pipe(writableStream);

    console.log("Updated CSV file saved as updated-netflix.csv'");
}

// Start processing
//processNetflixHistory(); 