// ✅ CreateReleaseForm.js (React Component)
import React, { useState } from 'react';

const CreateReleaseForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    artistName: '',
    genre: '',
    releaseDate: '',
    isExplicit: false,
    coverArt: null,
    audioFile: null,
    termsAgreed: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'file' ? files[0] : type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    for (let key in formData) {
      data.append(key, formData[key]);
    }

    const res = await fetch('/api/submit-track', {
      method: 'POST',
      body: data
    });

    if (res.ok) {
      alert('Track submitted successfully!');
    } else {
      alert('Submission failed.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" name="title" placeholder="Song Title" onChange={handleChange} required />
      <input type="text" name="artistName" placeholder="Artist Name" onChange={handleChange} required />
      <input type="text" name="genre" placeholder="Genre" onChange={handleChange} />
      <input type="date" name="releaseDate" onChange={handleChange} />
      <label>
        Explicit Content?
        <input type="checkbox" name="isExplicit" onChange={handleChange} />
      </label>
      <label>
        Upload Cover Art:
        <input type="file" name="coverArt" accept="image/*" onChange={handleChange} required />
      </label>
      <label>
        Upload Audio File:
        <input type="file" name="audioFile" accept="audio/*" onChange={handleChange} required />
      </label>
      <label>
        <input type="checkbox" name="termsAgreed" onChange={handleChange} required />
        I confirm I own or control all rights to this music and authorize StreampireX to distribute it.
      </label>
      <button type="submit">Submit for Distribution</button>
    </form>
  );
};

export default CreateReleaseForm;
