import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const BrowseRadioStations = () => {
    const { genre } = useParams();  // Get genre from the URL
    const [radioStations, setRadioStations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/api/radio-stations/${genre}`)
            .then(response => response.json())
            .then(data => {
                setRadioStations(data);
                setLoading(false);
            })
            .catch(error => {
                console.error("There was an error fetching the radio stations!", error);
            });
    }, [genre]);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <h1>📻 Radio Stations - {genre}</h1>
            <ul>
                {radioStations.length === 0 ? (
                    <p>No stations found for this genre.</p>
                ) : (
                    radioStations.map((station) => (
                        <li key={station.id}>
                            <a href={station.url} target="_blank" rel="noopener noreferrer">
                                {station.name} - {station.country}
                            </a>
                        </li>
                    ))
                )}
            </ul>
        </div>
    );
};

export default BrowseRadioStations;
