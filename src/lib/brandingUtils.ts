export const applyLogoBranding = (
  sourceImage: string,
  logoUrl: string | null,
  storeName: string,
  options: {
    useBranding: boolean;
    brandingStyle: 'smooth' | 'elegant' | 'classic' | 'polaroid';
    logoOpacity: number;
    logoPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  }
): Promise<string> => {
  return new Promise((resolve) => {
    if (!options.useBranding || !sourceImage.startsWith('data:image')) {
      resolve(sourceImage);
      return;
    }

    const mainImg = new Image();
    mainImg.crossOrigin = "anonymous";
    mainImg.src = sourceImage;

    mainImg.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = mainImg.width;
      canvas.height = mainImg.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(sourceImage);
        return;
      }

      // Draw main image
      ctx.drawImage(mainImg, 0, 0);

      const drawOverlay = (logo: HTMLImageElement | null) => {
        const minDim = Math.min(canvas.width, canvas.height);
        const { brandingStyle, logoOpacity, logoPosition } = options;

        if (brandingStyle === 'smooth') {
           const grad = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
           grad.addColorStop(0, 'rgba(0,0,0,0)');
           grad.addColorStop(1, 'rgba(0,0,0,0.75)');
           ctx.fillStyle = grad;
           ctx.shadowColor = "transparent";
           ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);

           const fontSize = Math.round(minDim * 0.04);
           ctx.fillStyle = 'rgba(255,255,255,0.95)';
           ctx.font = `bold ${fontSize}px Tajawal, system-ui, sans-serif`;
           ctx.textAlign = 'center';
           ctx.shadowColor = "rgba(0,0,0,0.5)";
           ctx.shadowBlur = 8;
           ctx.fillText(storeName, canvas.width / 2, canvas.height - (minDim * 0.05));

           if (logo) {
               const aspect = logo.width / logo.height;
               const logoSize = minDim * 0.08;
               let drawW = logoSize;
               let drawH = logoSize / aspect;
               if (aspect < 1) { drawH = logoSize; drawW = logoSize * aspect; }
               ctx.globalAlpha = logoOpacity;
               ctx.shadowColor = "rgba(0,0,0,0.2)";
               ctx.drawImage(logo, canvas.width / 2 - drawW / 2, canvas.height - (minDim * 0.05) - fontSize - drawH - (minDim*0.02), drawW, drawH);
           }
        }
        else if (brandingStyle === 'elegant') {
           const margin = minDim * 0.04;
           
           ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
           ctx.lineWidth = Math.max(1, minDim * 0.003);
           ctx.strokeRect(margin, margin, canvas.width - margin*2, canvas.height - margin*2);
           
           const fontSize = Math.round(minDim * 0.04);
           ctx.fillStyle = 'rgba(255,255,255,0.95)';
           ctx.font = `italic ${fontSize}px serif`;
           ctx.textAlign = 'center';
           ctx.shadowColor = "rgba(0,0,0,0.5)";
           ctx.shadowBlur = 10;
           ctx.fillText(storeName, canvas.width / 2, canvas.height - margin - (minDim * 0.03));

           if (logo) {
               const aspect = logo.width / logo.height;
               const logoSize = minDim * 0.1;
               let drawW = logoSize;
               let drawH = logoSize / aspect;
               if (aspect < 1) { drawH = logoSize; drawW = logoSize * aspect; }
               ctx.globalAlpha = logoOpacity;
               ctx.shadowColor = "rgba(0,0,0,0.2)";
               ctx.shadowBlur = 10;
               ctx.drawImage(logo, canvas.width / 2 - drawW / 2, margin + minDim * 0.03, drawW, drawH);
           }
        }
        else if (brandingStyle === 'polaroid') {
           const frameWidth = minDim * 0.03;
           const bottomFrame = minDim * 0.15;
           
           ctx.fillStyle = '#ffffff';
           ctx.globalAlpha = 1;
           ctx.shadowColor = "rgba(0,0,0,0.1)";
           ctx.fillRect(0, 0, canvas.width, frameWidth);
           ctx.fillRect(0, 0, frameWidth, canvas.height);
           ctx.fillRect(canvas.width - frameWidth, 0, frameWidth, canvas.height);
           ctx.fillRect(0, canvas.height - bottomFrame, canvas.width, bottomFrame);

           if (logo) {
               const aspect = logo.width / logo.height;
               const logoSize = bottomFrame * 0.4;
               let drawW = logoSize;
               let drawH = logoSize / aspect;
               if (aspect < 1) { drawH = logoSize; drawW = logoSize * aspect; }
               ctx.globalAlpha = logoOpacity;
               ctx.drawImage(logo, canvas.width - frameWidth - drawW - (minDim*0.02), canvas.height - (bottomFrame/2) - (drawH/2), drawW, drawH);
           }

           const fontSize = Math.round(bottomFrame * 0.25);
           ctx.fillStyle = '#333333';
           ctx.font = `bold ${fontSize}px Tajawal, system-ui, sans-serif`;
           ctx.textAlign = 'right';
           ctx.shadowColor = "transparent";
           ctx.fillText(storeName, canvas.width - frameWidth - (minDim*0.02) - (logo ? (logoSize + minDim*0.02) : 0), canvas.height - (bottomFrame/2) + (fontSize*0.35));
        }
        else {
           // classic
           if (logo) {
               const aspect = logo.width / logo.height;
               const logoScale = 0.12;
               const logoSize = Math.max(10, Math.min(canvas.width, canvas.height) * logoScale);
               
               let x = 0, y = 0;
               const padding = canvas.width * 0.05;

               if (logoPosition === 'top-right') {
                 x = canvas.width - logoSize - padding;
                 y = padding;
               } else if (logoPosition === 'top-left') {
                 x = padding;
                 y = padding;
               } else if (logoPosition === 'bottom-right') {
                 x = canvas.width - logoSize - padding;
                 y = canvas.height - logoSize - padding;
               } else if (logoPosition === 'bottom-left') {
                 x = padding;
                 y = canvas.height - logoSize - padding;
               }

               ctx.shadowColor = "rgba(0,0,0,0.3)";
               ctx.shadowBlur = 15;
               ctx.globalAlpha = logoOpacity;
               
               let drawW = logoSize;
               let drawH = logoSize / aspect;
               if (aspect < 1) {
                  drawH = logoSize;
                  drawW = logoSize * aspect;
               }
               ctx.drawImage(logo, x, y, drawW, drawH);
           }
        }
        
        resolve(canvas.toDataURL('image/png'));
      };

      if (logoUrl) {
          const logoImg = new Image();
          logoImg.crossOrigin = "anonymous";
          logoImg.src = logoUrl;
          logoImg.onload = () => drawOverlay(logoImg);
          logoImg.onerror = () => drawOverlay(null);
      } else {
          drawOverlay(null);
      }
    };
    mainImg.onerror = () => resolve(sourceImage);
  });
};
