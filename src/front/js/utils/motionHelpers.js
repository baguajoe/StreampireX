export function sendToMotion(actions, navigate, payload) {
  actions.sendToMotion(payload);
  navigate("/node-compositor");
}
