export const fileToBase64 = (file: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || "");
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

export const getAudioDuration = (file: Blob) =>
  new Promise<number | undefined>((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      resolve(Number.isFinite(audio.duration) ? audio.duration : undefined);
      URL.revokeObjectURL(audio.src);
    };
    audio.onerror = () => resolve(undefined);
    audio.src = URL.createObjectURL(file);
  });
