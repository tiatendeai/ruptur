const emojiFavicon = `data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-size="82">🛟</text></svg>',
)}`;

export default function Head() {
  return (
    <>
      <link rel="icon" href={emojiFavicon} />
      <link rel="apple-touch-icon" href={emojiFavicon} />
    </>
  );
}
