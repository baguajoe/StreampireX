import React, { useEffect, useState } from "react";

const CommentsPage = ({ contentId, contentType }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/comments/${contentType}/${contentId}`)
      .then((res) => res.json())
      .then((data) => setComments(data))
      .catch((err) => console.error("Error fetching comments:", err));
  }, [contentId, contentType]);

  const postComment = () => {
    fetch(`${process.env.REACT_APP_BACKEND_URL}/api/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`
      },
      body: JSON.stringify({ content_id: contentId, content_type: contentType, text: newComment })
    })
      .then((res) => res.json())
      .then((data) => {
        alert(data.message);
        setComments([...comments, { text: newComment, created_at: new Date() }]);
        setNewComment("");
      })
      .catch((err) => console.error("Error posting comment:", err));
  };

  return (
    <div className="comments-page">
      <h1>💬 Comments</h1>
      <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} />
      <button onClick={postComment}>Post Comment</button>
      <div className="comment-list">
        {comments.map((comment, index) => (
          <div key={index} className="comment-card">
            <p>{comment.text}</p>
            <small>{new Date(comment.created_at).toLocaleString()}</small>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CommentsPage;
