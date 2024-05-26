import { Readable } from 'node:stream';

export default async (req, res) => {
  const { slug } = req.query;

  const buf = Buffer.from(slug, 'base64');
  const [orderId, imgUrl] = JSON.parse(buf);
  const response = await fetch(imgUrl);

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `attachment; filename="${orderId}.png"`);
  Readable.fromWeb(response.body).pipe(res);
}