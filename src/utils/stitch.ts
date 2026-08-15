export function stitchImages(
  captures: { dataUrl: string; scrollY: number; viewportHeight: number }[]
): Promise<string> {
  return new Promise((resolve, reject) => {
    const images: HTMLImageElement[] = [];
    let loadedCount = 0;
    const total = captures.length;

    if (total === 0) {
      reject(new Error('No captures to stitch'));
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas not supported'));
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
      img.onerror = () => reject(new Error('Failed to load capture image'));
      img.src = cap.dataUrl;
      images.push(img);
    });

    function finishStitch(
      ctx: CanvasRenderingContext2D,
      canvas: HTMLCanvasElement,
      images: HTMLImageElement[],
      captures: { dataUrl: string; scrollY: number; viewportHeight: number }[]
    ): void {
      const maxHeight = Math.max(
        ...captures.map((c) => c.scrollY + c.viewportHeight)
      );

      canvas.width = images[0].width;
      canvas.height = maxHeight;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      captures.forEach((cap, index) => {
        const img = images[index];
        ctx.drawImage(img, 0, cap.scrollY);
      });

      resolve(canvas.toDataURL('image/png'));
    }
  });
}
