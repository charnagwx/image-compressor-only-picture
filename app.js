/**
 * 简单图片压缩工具
 * - 只在浏览器本地处理图片，不上传到服务器
 * - 使用 canvas 进行压缩
 */

const MAX_FILE_SIZE_MB = 20;
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const fileInput = document.getElementById("file-input");
const dropArea = document.getElementById("drop-area");
const chooseBtn = document.getElementById("choose-btn");
const errorMessageEl = document.getElementById("error-message");

const qualitySlider = document.getElementById("quality-slider");
const qualityValueEl = document.getElementById("quality-value");

const originalPreview = document.getElementById("original-preview");
const compressedPreview = document.getElementById("compressed-preview");
const originalInfo = document.getElementById("original-info");
const compressedInfo = document.getElementById("compressed-info");
const downloadBtn = document.getElementById("download-btn");

let currentOriginalFile = null;
let currentCompressedBlob = null;

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i += 1;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

function setError(message) {
  errorMessageEl.textContent = message || "";
}

function clearCompressedPreview() {
  compressedPreview.style.display = "none";
  compressedPreview.src = "";
  compressedInfo.textContent = "请先上传图片";
  downloadBtn.disabled = true;
  currentCompressedBlob = null;
}

function validateFile(file) {
  if (!file) {
    setError("未选择文件");
    return false;
  }

  if (!SUPPORTED_TYPES.includes(file.type)) {
    setError("只支持 JPG / PNG / WebP 格式的图片");
    return false;
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > MAX_FILE_SIZE_MB) {
    setError(`图片太大啦！最大支持 ${MAX_FILE_SIZE_MB} MB`);
    return false;
  }

  setError("");
  return true;
}

function updateOriginalPreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    originalPreview.src = e.target.result;
    originalPreview.style.display = "block";
  };
  reader.onerror = () => {
    setError("读取图片失败，请重试");
  };
  reader.readAsDataURL(file);

  originalInfo.textContent = `文件名：${file.name} ｜ 大小：${formatBytes(
    file.size
  )}`;
}

function compressImage(file, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const mimeType = file.type || "image/jpeg";

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("压缩失败，生成的图片为空"));
            return;
          }
          resolve(blob);
        },
        mimeType,
        quality
      );
    };
    img.onerror = () => reject(new Error("图片加载失败"));

    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

async function handleFile(file) {
  if (!validateFile(file)) {
    return;
  }

  currentOriginalFile = file;
  clearCompressedPreview();
  updateOriginalPreview(file);

  const quality = Number(qualitySlider.value) / 100;

  try {
    const compressedBlob = await compressImage(file, quality);
    currentCompressedBlob = compressedBlob;

    const previewUrl = URL.createObjectURL(compressedBlob);
    compressedPreview.src = previewUrl;
    compressedPreview.style.display = "block";

    const originalBytes = file.size;
    const compressedBytes = compressedBlob.size;
    const ratio =
      originalBytes > 0
        ? (((originalBytes - compressedBytes) / originalBytes) * 100).toFixed(1)
        : 0;

    compressedInfo.textContent = `大小：${formatBytes(
      compressedBytes
    )} ｜ 压缩比例：${ratio}%`;

    downloadBtn.disabled = false;
  } catch (err) {
    console.error(err);
    setError("压缩失败，请尝试降低质量或更换图片");
  }
}

chooseBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (file) {
    handleFile(file);
  }
});

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", (e) => {
  e.preventDefault();
  dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("dragover");
  const file = e.dataTransfer.files && e.dataTransfer.files[0];
  if (file) {
    handleFile(file);
  }
});

qualitySlider.addEventListener("input", () => {
  qualityValueEl.textContent = qualitySlider.value;

  if (currentOriginalFile) {
    handleFile(currentOriginalFile);
  }
});

downloadBtn.addEventListener("click", () => {
  if (!currentCompressedBlob || !currentOriginalFile) return;

  const url = URL.createObjectURL(currentCompressedBlob);
  const a = document.createElement("a");
  const dotIndex = currentOriginalFile.name.lastIndexOf(".");
  const baseName =
    dotIndex > 0
      ? currentOriginalFile.name.slice(0, dotIndex)
      : currentOriginalFile.name;
  const ext =
    dotIndex > 0 ? currentOriginalFile.name.slice(dotIndex) : ".jpg";
  a.href = url;
  a.download = `${baseName}-compressed${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});


