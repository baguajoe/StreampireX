export async function requestRender(project) {
  try {
    const res = await fetch("/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(project)
    });

    return await res.json();
  } catch (err) {
    return { error: err.message };
  }
}
