const vistos = new Set();

export default function handler(req, res) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket?.remoteAddress || "unknown";

  if (vistos.has(ip)) {
    return res.status(200).json({ show: false });
  }

  vistos.add(ip);

  return res.status(200).json({ show: true });
}
