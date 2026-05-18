export const applyLogoBranding = (
  sourceImage: string,
  logoUrl: string | null,
  storeName: string,
  options: {
    useBranding: boolean;
    brandingStyle: 'smooth' | 'elegant' | 'classic' | 'polaroid' | 'heritage';
    logoOpacity: number;
    logoPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
    customText?: string;
    textPosition?: 'bottom' | 'top' | 'center' | 'hidden';
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
        const { brandingStyle, logoOpacity, logoPosition, textPosition = 'hidden', customText } = options;
        
        let actualText = '';
        if (textPosition !== 'hidden') {
          actualText = customText !== undefined ? customText : storeName;
        }

        let paddingX = canvas.width * 0.05;
        let paddingY = canvas.height * 0.05;

        // Base padding calculation to avoid overlapping frames
        if (brandingStyle === 'polaroid') {
            const frameWidth = minDim * 0.03;
            const bottomFrame = minDim * 0.15;
            paddingX = Math.max(paddingX, frameWidth + minDim * 0.02);
            if (logoPosition.startsWith('bottom')) {
                paddingY = Math.max(paddingY, bottomFrame + minDim * 0.02);
            } else {
                paddingY = Math.max(paddingY, frameWidth + minDim * 0.02);
            }
        } else if (brandingStyle === 'elegant') {
            const margin = minDim * 0.04;
            paddingX = Math.max(paddingX, margin + minDim * 0.02);
            paddingY = Math.max(paddingY, margin + minDim * 0.02);
        } else if (brandingStyle === 'heritage') {
            const margin = minDim * 0.05;
            paddingX = Math.max(paddingX, margin + minDim * 0.02);
            paddingY = Math.max(paddingY, margin + minDim * 0.02);
        }

        // Draw frames
        if (brandingStyle === 'smooth') {
           if (actualText && textPosition === 'bottom') {
             const grad = ctx.createLinearGradient(0, canvas.height * 0.6, 0, canvas.height);
             grad.addColorStop(0, 'rgba(0,0,0,0)');
             grad.addColorStop(1, 'rgba(0,0,0,0.75)');
             ctx.fillStyle = grad;
             ctx.shadowColor = "transparent";
             ctx.fillRect(0, canvas.height * 0.6, canvas.width, canvas.height * 0.4);
           }
        }
        else if (brandingStyle === 'elegant') {
           const margin = minDim * 0.04;
           ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
           ctx.lineWidth = Math.max(1, minDim * 0.003);
           ctx.strokeRect(margin, margin, canvas.width - margin*2, canvas.height - margin*2);
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
        }
        else if (brandingStyle === 'heritage') {
           const margin = minDim * 0.05;
           // Double border with warm/gold tones
           ctx.strokeStyle = 'rgba(218, 165, 32, 0.6)'; // Goldenrod
           ctx.lineWidth = Math.max(1, minDim * 0.008);
           ctx.strokeRect(margin, margin, canvas.width - margin*2, canvas.height - margin*2);
           
           ctx.strokeStyle = 'rgba(218, 165, 32, 0.3)';
           ctx.lineWidth = Math.max(1, minDim * 0.002);
           ctx.strokeRect(margin + minDim * 0.015, margin + minDim * 0.015, canvas.width - (margin + minDim * 0.015)*2, canvas.height - (margin + minDim * 0.015)*2);

           if (actualText && textPosition === 'bottom') {
             // Gradient background for text
             const grad = ctx.createLinearGradient(0, canvas.height * 0.7, 0, canvas.height);
             grad.addColorStop(0, 'rgba(0,0,0,0)');
             grad.addColorStop(1, 'rgba(60, 40, 20, 0.85)'); // Warm dark brown/black
             ctx.fillStyle = grad;
             ctx.shadowColor = "transparent";
             ctx.fillRect(0, canvas.height * 0.7, canvas.width, canvas.height * 0.3);
           }
        }

        // Draw text
        if (actualText) {
          ctx.globalAlpha = 1;
          const fontSize = brandingStyle === 'polaroid' ? Math.round(minDim * 0.15 * 0.25) : Math.round(minDim * 0.045);
          ctx.fillStyle = brandingStyle === 'polaroid' ? '#333333' : 'rgba(255,255,255,0.95)';
          ctx.font = `bold ${fontSize}px Tajawal, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          if (brandingStyle === 'polaroid') {
            ctx.shadowColor = "transparent";
          } else {
            ctx.shadowColor = "rgba(0,0,0,0.8)";
            ctx.shadowBlur = 8;
          }

          let textY = canvas.height / 2;
          if (textPosition === 'bottom') {
            if (brandingStyle === 'polaroid') {
              textY = canvas.height - (minDim * 0.15 / 2);
            } else {
              textY = canvas.height - paddingY - fontSize;
            }
          } else if (textPosition === 'top') {
            textY = paddingY + fontSize;
          }

          ctx.fillText(actualText, canvas.width / 2, textY);
          
          // Avoid logo collision with text if logo and text overlap
          if (textPosition === 'top' && logoPosition.startsWith('top')) {
             paddingY += fontSize * 2;
          } else if (textPosition === 'bottom' && logoPosition.startsWith('bottom')) {
             paddingY += fontSize * 2;
          }
        }

        // Always draw the logo globally based on user position choice
        if (logo) {
            const aspect = logo.width / logo.height;
            const logoScale = 0.12;
            const logoSize = Math.max(10, Math.min(canvas.width, canvas.height) * logoScale);
            
            let x = 0, y = 0;

            if (logoPosition === 'top-right') {
              x = canvas.width - logoSize - paddingX;
              y = paddingY;
            } else if (logoPosition === 'top-left') {
              x = paddingX;
              y = paddingY;
            } else if (logoPosition === 'bottom-right') {
              x = canvas.width - logoSize - paddingX;
              y = canvas.height - logoSize - paddingY;
            } else if (logoPosition === 'bottom-left') {
              x = paddingX;
              y = canvas.height - logoSize - paddingY;
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
            if (logoPosition.startsWith('bottom')) {
               // Adjust Y to align bottom of logo to paddingY constraint
               y = canvas.height - drawH - paddingY;
            }
            ctx.drawImage(logo, x, y, drawW, drawH);
        }
        
        resolve(canvas.toDataURL('image/jpeg', 0.85));
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

export const downloadImage = (dataUrl: string, filename: string) => {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
