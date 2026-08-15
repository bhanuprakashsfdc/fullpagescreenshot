// src/utils/stitch.ts
function stitchImages(captures) {
  return new Promise((resolve, reject) => {
    const images = [];
    let loadedCount = 0;
    const total = captures.length;
    if (total === 0) {
      reject(new Error("No captures to stitch"));
      return;
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }
    captures.forEach((cap) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === total) {
          finishStitch(ctx, canvas, images, captures);
        }
      };
      img.onerror = () => reject(new Error("Failed to load capture image"));
      img.src = cap.dataUrl;
      images.push(img);
    });
    function finishStitch(ctx2, canvas2, images2, captures2) {
      const maxHeight = Math.max(
        ...captures2.map((c) => c.scrollY + c.viewportHeight)
      );
      canvas2.width = images2[0].width;
      canvas2.height = maxHeight;
      ctx2.fillStyle = "#ffffff";
      ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
      captures2.forEach((cap, index) => {
        const img = images2[index];
        ctx2.drawImage(img, 0, cap.scrollY);
      });
      resolve(canvas2.toDataURL("image/png"));
    }
  });
}
export {
  stitchImages
};
