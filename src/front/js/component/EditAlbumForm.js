import React, { useState } from "react";

const EditAlbumForm = ({ album, onUpdateSuccess, onCancel }) => {
  const [title, setTitle] = useState(album.title);
  const [description, setDescription] = useState(album.description || "");
  const [coverImage, setCoverImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    if (coverImage) formData.append("cover_image", coverImage);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_BACKEND_URL}/api/album/${album.id}/edit`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Failed to update album");

      onUpdateSuccess(); // Refresh data
    } catch (err) {
      alert("❌ Failed to update album");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-album-form">
      <h3>✏️ Edit Album</h3>
      <form onSubmit={handleUpdate}>
        <div>
          <label>Album Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label>Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>

        <div>
          <label>Change Cover Image:</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setCoverImage(e.target.files[0])}
          />
        </div>

        <div className="form-buttons">
          <button type="submit" disabled={loading}>
            {loading ? "Saving..." : "✅ Save Changes"}
          </button>
          <button type="button" onClick={onCancel}>
            ❌ Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditAlbumForm;
