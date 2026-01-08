/**
 * 图片处理工具 - 简洁版
 * 功能：压缩图片、修改证件照尺寸
 */

// ===== 常量定义 =====
const MAX_FILE_SIZE_MB = 20;
const SUPPORTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];

// 证件照尺寸（300 DPI）
const IDPHOTO_SIZES = {
  "1inch": { width: 295, height: 413 },
  "small1inch": { width: 260, height: 378 },
  "large1inch": { width: 390, height: 567 },
  "2inch": { width: 413, height: 579 },
  "small2inch": { width: 390, height: 567 },
  "large2inch": { width: 413, height: 626 },
  "custom": null
};

// ===== DOM 元素 =====
// 压缩功能
const fileInput = document.getElementById("file-input");
const dropArea = document.getElementById("drop-area");
const chooseBtn = document.getElementById("choose-btn");
const qualitySlider = document.getElementById("quality-slider");
const qualityInput = document.getElementById("quality-input");
const sizeInput = document.getElementById("size-input");
const widthInput = document.getElementById("width-input");
const heightInput = document.getElementById("height-input");
const compressModeRadios = document.querySelectorAll('input[name="compress-mode"]');
const qualityMode = document.getElementById("quality-mode");
const sizeMode = document.getElementById("size-mode");
const pixelMode = document.getElementById("pixel-mode");
const originalPreview = document.getElementById("original-preview");
const compressedPreview = document.getElementById("compressed-preview");
const originalInfo = document.getElementById("original-info");
const compressedInfo = document.getElementById("compressed-info");
const downloadBtn = document.getElementById("download-btn");
const compressControls = document.getElementById("compress-controls");
const previewArea = document.getElementById("preview-area");
const errorMessage = document.getElementById("error-message");

// 证件照功能
const idphotoFileInput = document.getElementById("idphoto-file-input");
const idphotoDropArea = document.getElementById("idphoto-drop-area");
const idphotoChooseBtn = document.getElementById("idphoto-choose-btn");
const idphotoSizeRadios = document.querySelectorAll('input[name="idphoto-size"]');
const customSizeInputs = document.getElementById("custom-size-inputs");
const customWidth = document.getElementById("custom-width");
const customHeight = document.getElementById("custom-height");
const idphotoPreview = document.getElementById("idphoto-preview");
const idphotoInfo = document.getElementById("idphoto-info");
const downloadIdphotoBtn = document.getElementById("download-idphoto-btn");
const idphotoControls = document.getElementById("idphoto-controls");
const idphotoPreviewArea = document.getElementById("idphoto-preview-area");

// 功能切换
const tabBtns = document.querySelectorAll(".tab-btn");
const compressPanel = document.getElementById("compress-panel");
const idphotoPanel = document.getElementById("idphoto-panel");

// 模态框
const imageModal = document.getElementById("image-modal");
const modalImage = document.getElementById("modal-image");
const modalClose = document.querySelector(".modal-close");

// ===== 状态变量 =====
let currentFile = null;
let currentImageData = null;
let currentCompressedBlob = null;
let currentIdphotoBlob = null;
let compressionTimer = null;
let batchFiles = []; // 批量文件列表
let currentCompressedPreviewUrl = null; // 当前压缩预览URL，用于清理

// 批量相关DOM
const batchListSection = document.getElementById("batch-list-section");
const batchList = document.getElementById("batch-list");
const batchCount = document.getElementById("batch-count");
const compressAllBtn = document.getElementById("compress-all-btn");
const downloadAllBtn = document.getElementById("download-all-btn");
const clearAllBtn = document.getElementById("clear-all-btn");
const zoomOriginalBtn = document.getElementById("zoom-original-btn");
const deleteOriginalBtn = document.getElementById("delete-original-btn");
const zoomCompressedBtn = document.getElementById("zoom-compressed-btn");
const zoomIdphotoOriginalBtn = document.getElementById("zoom-idphoto-original-btn");
const deleteIdphotoOriginalBtn = document.getElementById("delete-idphoto-original-btn");
const zoomIdphotoBtn = document.getElementById("zoom-idphoto-btn");
const idphotoOriginalPreview = document.getElementById("idphoto-original-preview");
const idphotoOriginalInfo = document.getElementById("idphoto-original-info");

// ===== 工具函数 =====
function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return "-";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let value = bytes;
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024;
    i++;
  }
  return `${value.toFixed(2)} ${units[i]}`;
}

function setError(msg) {
  errorMessage.textContent = msg || "";
}

function validateFile(file) {
  if (!file) {
    setError("未选择文件");
    return false;
  }
  if (!SUPPORTED_TYPES.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|avif|heic|heif)$/i)) {
    setError("不支持的图片格式");
    return false;
  }
  if (file.size / (1024 * 1024) > MAX_FILE_SIZE_MB) {
    setError(`图片太大，最大支持 ${MAX_FILE_SIZE_MB}MB`);
    return false;
  }
  setError("");
  return true;
}

async function convertFileToImage(file) {
  return new Promise((resolve, reject) => {
    // HEIC格式转换
    if (file.type === "image/heic" || file.type === "image/heif" || file.name.toLowerCase().endsWith(".heic")) {
      if (typeof heic2any === "undefined") {
        reject(new Error("HEIC格式需要加载转换库"));
        return;
      }
      heic2any({ blob: file, toType: "image/jpeg", quality: 1.0 })
        .then(blobs => {
          const blob = Array.isArray(blobs) ? blobs[0] : blobs;
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("图片加载失败"));
          img.src = URL.createObjectURL(blob);
        })
        .catch(reject);
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    const reader = new FileReader();
    reader.onload = (e) => { img.src = e.target.result; };
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

function blobToImage(blob) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("图片加载失败"));
    img.src = URL.createObjectURL(blob);
  });
}

// ===== 压缩功能 =====
async function compressImage(file, quality, maxWidth = null, maxHeight = null) {
  const img = await convertFileToImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  let targetWidth = img.width;
  let targetHeight = img.height;
  
  // 如果指定了最大尺寸，先调整尺寸
  if (maxWidth && maxHeight) {
    const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);
    if (ratio < 1) {
      targetWidth = Math.round(img.width * ratio);
      targetHeight = Math.round(img.height * ratio);
    }
  }
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
  
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) reject(new Error("压缩失败"));
      else resolve(blob);
    }, "image/jpeg", quality);
  });
}

// 指定大小压缩（二分法）
async function compressBySize(file, targetSizeKB) {
  const targetSizeBytes = targetSizeKB * 1024;
  let minQuality = 0.1;
  let maxQuality = 1.0;
  let bestBlob = null;
  let attempts = 0;
  const maxAttempts = 15;
  
  // 先尝试最高质量
  let testBlob = await compressImage(file, maxQuality);
  if (testBlob.size <= targetSizeBytes) {
    return testBlob;
  }
  
  // 二分法查找
  while (attempts < maxAttempts && (maxQuality - minQuality) > 0.01) {
    const midQuality = (minQuality + maxQuality) / 2;
    testBlob = await compressImage(file, midQuality);
    
    if (testBlob.size <= targetSizeBytes) {
      bestBlob = testBlob;
      minQuality = midQuality;
    } else {
      maxQuality = midQuality;
    }
    attempts++;
  }
  
  return bestBlob || await compressImage(file, 0.1);
}

async function handleCompressFile(file) {
  if (!validateFile(file)) return;
  
  currentFile = file;
  setError("");
  
  try {
    // 显示原图
    const img = await convertFileToImage(file);
    originalPreview.src = img.src;
    originalPreview.style.display = "block";
    currentImageData = { width: img.width, height: img.height };
    originalInfo.textContent = `${file.name} · ${formatBytes(file.size)} · ${img.width}×${img.height}px`;
    
    // 设置默认值：显示原图的大小和像素
    qualityInput.value = 100;
    qualitySlider.value = 100;
    sizeInput.value = Math.round(file.size / 1024); // 原图大小（KB）
    widthInput.value = img.width; // 原图像素宽度
    heightInput.value = img.height; // 原图像素高度
    
    // 显示放大和删除按钮
    zoomOriginalBtn.style.display = "flex";
    deleteOriginalBtn.style.display = "flex";
    
    // 显示控制面板和预览区域
    compressControls.style.display = "block";
    previewArea.style.display = "block";
    
    // 自动压缩
    await performCompression();
  } catch (err) {
    setError(err.message || "处理失败");
  }
}

function getCurrentCompressMode() {
  const checked = document.querySelector('input[name="compress-mode"]:checked');
  return checked ? checked.value : "quality";
}

function switchCompressMode(mode) {
  // 隐藏所有模式控制
  qualityMode.classList.remove("active");
  sizeMode.classList.remove("active");
  pixelMode.classList.remove("active");
  
  // 显示选中的模式
  switch (mode) {
    case "quality":
      qualityMode.classList.add("active");
      break;
    case "size":
      sizeMode.classList.add("active");
      break;
    case "pixel":
      pixelMode.classList.add("active");
      break;
  }
}

async function performCompression() {
  if (!currentFile) return;
  
  const mode = getCurrentCompressMode();
  compressedInfo.textContent = "压缩中...";
  downloadBtn.disabled = true;
  
  try {
    let blob;
    
    switch (mode) {
      case "quality": {
        const quality = Number(qualityInput.value) / 100;
        blob = await compressImage(currentFile, quality);
        break;
      }
      case "size": {
        const targetSize = Number(sizeInput.value);
        blob = await compressBySize(currentFile, targetSize);
        break;
      }
      case "pixel": {
        const maxWidth = Number(widthInput.value);
        const maxHeight = Number(heightInput.value);
        blob = await compressImage(currentFile, 0.85, maxWidth, maxHeight);
        break;
      }
      default:
        throw new Error("未知的压缩模式");
    }
    
    currentCompressedBlob = blob;
    
    // 清理旧的预览URL
    if (currentCompressedPreviewUrl) {
      URL.revokeObjectURL(currentCompressedPreviewUrl);
    }
    
    const previewUrl = URL.createObjectURL(blob);
    currentCompressedPreviewUrl = previewUrl;
    compressedPreview.src = previewUrl;
    compressedPreview.style.display = "block";

    const ratio = currentFile.size > 0 
      ? ((currentFile.size - blob.size) / currentFile.size * 100).toFixed(1)
      : 0;
    const img = await blobToImage(blob);
    compressedInfo.textContent = `${formatBytes(blob.size)} · 压缩${ratio}% · ${img.width}×${img.height}px`;
    downloadBtn.disabled = false;
    zoomCompressedBtn.style.display = "flex";
  } catch (err) {
    compressedInfo.textContent = "压缩失败";
    setError(err.message);
  }
}

// ===== 证件照功能 =====
function getCurrentIdphotoSize() {
  const selected = document.querySelector('input[name="idphoto-size"]:checked');
  if (!selected) return IDPHOTO_SIZES["1inch"];
  
  if (selected.value === "custom") {
    return {
      width: Number(customWidth.value),
      height: Number(customHeight.value)
    };
  }
  
  return IDPHOTO_SIZES[selected.value];
}

async function handleIdphotoFile(file) {
  if (!validateFile(file)) return;
  
  currentFile = file;
  setError("");
  
  try {
    // 显示原图
    const img = await convertFileToImage(file);
    idphotoOriginalPreview.src = img.src;
    idphotoOriginalPreview.style.display = "block";
    currentImageData = { width: img.width, height: img.height };
    idphotoOriginalInfo.textContent = `${file.name} · ${formatBytes(file.size)} · ${img.width}×${img.height}px`;
    
    // 显示放大和删除按钮
    zoomIdphotoOriginalBtn.style.display = "flex";
    deleteIdphotoOriginalBtn.style.display = "flex";
    
    // 显示控制面板和预览区域
    idphotoControls.style.display = "block";
    idphotoPreviewArea.style.display = "block";
    
    // 自动处理
    await processIdphoto();
  } catch (err) {
    setError(err.message || "处理失败");
  }
}

async function processIdphoto() {
  if (!currentFile || !currentImageData) return;
  
  const targetSize = getCurrentIdphotoSize();
  idphotoInfo.textContent = "处理中...";
  downloadIdphotoBtn.disabled = true;
  
  try {
    const img = await convertFileToImage(currentFile);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    
    canvas.width = targetSize.width;
    canvas.height = targetSize.height;
    
    // 填充白色背景
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 计算缩放比例（保持宽高比，填充整个画布）
    const scaleX = canvas.width / img.width;
    const scaleY = canvas.height / img.height;
    const scale = Math.max(scaleX, scaleY);
    
    const scaledWidth = img.width * scale;
    const scaledHeight = img.height * scale;
    const x = (canvas.width - scaledWidth) / 2;
    const y = (canvas.height - scaledHeight) / 2;
    
    ctx.drawImage(img, x, y, scaledWidth, scaledHeight);
    
    canvas.toBlob((blob) => {
      if (!blob) {
        idphotoInfo.textContent = "处理失败";
        return;
      }
      
      currentIdphotoBlob = blob;
      const previewUrl = URL.createObjectURL(blob);
      idphotoPreview.src = previewUrl;
      idphotoPreview.style.display = "block";
      
      idphotoInfo.textContent = `${targetSize.width}×${targetSize.height}px · ${formatBytes(blob.size)}`;
      downloadIdphotoBtn.disabled = false;
      zoomIdphotoBtn.style.display = "flex";
    }, "image/jpeg", 0.95);
  } catch (err) {
    idphotoInfo.textContent = "处理失败";
    setError(err.message);
  }
}

// ===== 功能切换 =====
function switchTab(tabName) {
  tabBtns.forEach(btn => {
    if (btn.dataset.tab === tabName) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
  
  if (tabName === "compress") {
    compressPanel.classList.add("active");
    idphotoPanel.classList.remove("active");
  } else {
    compressPanel.classList.remove("active");
    idphotoPanel.classList.add("active");
  }
}

// ===== 图片放大 =====
function zoomImage(src) {
  modalImage.src = src;
  imageModal.style.display = "flex";
}

function closeModal() {
  imageModal.style.display = "none";
  modalImage.src = "";
}

// ===== 事件监听 =====
// 功能切换
tabBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    switchTab(btn.dataset.tab);
  });
});

// 压缩功能
chooseBtn.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => {
  const files = e.target.files;
  if (files && files.length > 0) {
    handleCompressFiles(files);
  }
});

dropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropArea.classList.add("dragover");
});

dropArea.addEventListener("dragleave", () => {
  dropArea.classList.remove("dragover");
});

dropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  dropArea.classList.remove("dragover");
  const files = e.dataTransfer.files;
  if (files && files.length > 0) {
    handleCompressFiles(files);
  }
});

// 压缩模式切换
compressModeRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    switchCompressMode(radio.value);
    if (currentFile) {
      if (compressionTimer) clearTimeout(compressionTimer);
      compressionTimer = setTimeout(performCompression, 300);
    }
  });
});

qualitySlider.addEventListener("input", () => {
  qualityInput.value = qualitySlider.value;
  if (compressionTimer) clearTimeout(compressionTimer);
  compressionTimer = setTimeout(performCompression, 300);
});

qualityInput.addEventListener("input", () => {
  let value = Number(qualityInput.value);
  if (value < 0) value = 0;
  if (value > 100) value = 100;
  qualitySlider.value = value;
  qualityInput.value = value;
  if (compressionTimer) clearTimeout(compressionTimer);
  compressionTimer = setTimeout(performCompression, 300);
});

// 指定大小模式
sizeInput.addEventListener("input", () => {
  if (compressionTimer) clearTimeout(compressionTimer);
  compressionTimer = setTimeout(performCompression, 300);
});

// 指定像素模式
widthInput.addEventListener("input", () => {
  if (compressionTimer) clearTimeout(compressionTimer);
  compressionTimer = setTimeout(performCompression, 300);
});

heightInput.addEventListener("input", () => {
  if (compressionTimer) clearTimeout(compressionTimer);
  compressionTimer = setTimeout(performCompression, 300);
});

downloadBtn.addEventListener("click", () => {
  if (!currentCompressedBlob) return;
  const url = URL.createObjectURL(currentCompressedBlob);
  const a = document.createElement("a");
  const baseName = currentFile.name.replace(/\.[^/.]+$/, "");
  a.href = url;
  a.download = `${baseName}-compressed.jpg`;
  a.click();
  URL.revokeObjectURL(url);
});

// 证件照功能
idphotoChooseBtn.addEventListener("click", () => idphotoFileInput.click());
idphotoFileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) handleIdphotoFile(file);
});

idphotoDropArea.addEventListener("dragover", (e) => {
  e.preventDefault();
  idphotoDropArea.classList.add("dragover");
});

idphotoDropArea.addEventListener("dragleave", () => {
  idphotoDropArea.classList.remove("dragover");
});

idphotoDropArea.addEventListener("drop", (e) => {
  e.preventDefault();
  idphotoDropArea.classList.remove("dragover");
  const file = e.dataTransfer.files?.[0];
  if (file) handleIdphotoFile(file);
});

idphotoSizeRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    if (radio.value === "custom") {
      customSizeInputs.style.display = "block";
    } else {
      customSizeInputs.style.display = "none";
    }
    if (currentFile) {
      if (compressionTimer) clearTimeout(compressionTimer);
      compressionTimer = setTimeout(processIdphoto, 300);
    }
  });
});

customWidth.addEventListener("input", () => {
  if (currentFile) {
    if (compressionTimer) clearTimeout(compressionTimer);
    compressionTimer = setTimeout(processIdphoto, 300);
  }
});

customHeight.addEventListener("input", () => {
  if (currentFile) {
    if (compressionTimer) clearTimeout(compressionTimer);
    compressionTimer = setTimeout(processIdphoto, 300);
  }
});

downloadIdphotoBtn.addEventListener("click", () => {
  if (!currentIdphotoBlob) return;
  const url = URL.createObjectURL(currentIdphotoBlob);
  const a = document.createElement("a");
  const baseName = currentFile.name.replace(/\.[^/.]+$/, "");
  const size = getCurrentIdphotoSize();
  a.href = url;
  a.download = `${baseName}-${size.width}x${size.height}.jpg`;
  a.click();
  URL.revokeObjectURL(url);
});

// 批量处理文件
async function handleCompressFiles(files) {
  const fileArray = Array.from(files);
  const validFiles = [];
  
  for (const file of fileArray) {
    if (validateFile(file)) {
      validFiles.push(file);
    }
  }
  
  if (validFiles.length === 0) return;
  
  if (validFiles.length === 1) {
    await handleCompressFile(validFiles[0]);
    return;
  }
  
  batchFiles = [];
  batchListSection.style.display = "block";
  batchList.innerHTML = "";
  batchCount.textContent = validFiles.length;
  
  // 批量模式时隐藏预览区域
  previewArea.style.display = "none";
  
  for (const file of validFiles) {
    try {
      const img = await convertFileToImage(file);
      const batchItem = {
        file,
        imageData: { width: img.width, height: img.height },
        compressedBlob: null,
        previewUrl: URL.createObjectURL(file),
        id: Date.now() + Math.random()
      };
      batchFiles.push(batchItem);
      addBatchItemToUI(batchItem);
    } catch (err) {
      console.error(`处理文件 ${file.name} 失败:`, err);
    }
  }
  
  // 显示压缩控制面板
  compressControls.style.display = "block";
}

function addBatchItemToUI(batchItem) {
  const itemDiv = document.createElement("div");
  itemDiv.className = "batch-item";
  itemDiv.dataset.id = batchItem.id;
  
  const img = document.createElement("img");
  img.src = batchItem.previewUrl;
  img.className = "batch-item-image";
  img.alt = batchItem.file.name;
  
  const info = document.createElement("div");
  info.className = "batch-item-info";
  const infoText = document.createElement("div");
  infoText.className = "batch-item-name";
  infoText.textContent = batchItem.file.name;
  const infoSize = document.createElement("div");
  infoSize.className = "batch-item-size";
  infoSize.textContent = `${formatBytes(batchItem.file.size)} · ${batchItem.imageData.width}×${batchItem.imageData.height}px`;
  info.appendChild(infoText);
  info.appendChild(infoSize);
  
  // 压缩结果信息
  const resultInfo = document.createElement("div");
  resultInfo.className = "batch-item-result";
  resultInfo.style.display = "none";
  info.appendChild(resultInfo);
  
  const actions = document.createElement("div");
  actions.className = "batch-item-actions";
  
  const compressBtn = document.createElement("button");
  compressBtn.className = "batch-item-btn";
  compressBtn.textContent = "压缩";
  compressBtn.onclick = () => compressBatchItem(batchItem);
  
  const downloadBtn = document.createElement("button");
  downloadBtn.className = "batch-item-btn";
  downloadBtn.textContent = "下载";
  downloadBtn.disabled = true;
  downloadBtn.onclick = () => downloadBatchItem(batchItem);
  
  const deleteBtn = document.createElement("button");
  deleteBtn.className = "batch-item-btn delete";
  deleteBtn.textContent = "删除";
  deleteBtn.onclick = () => deleteBatchItem(batchItem);
  
  actions.appendChild(compressBtn);
  actions.appendChild(downloadBtn);
  actions.appendChild(deleteBtn);
  
  itemDiv.appendChild(img);
  itemDiv.appendChild(info);
  itemDiv.appendChild(actions);
  
  batchList.appendChild(itemDiv);
  
  itemDiv.onclick = (e) => {
    if (!e.target.classList.contains("batch-item-btn")) {
      selectBatchItem(batchItem);
    }
  };
  
  batchItem.downloadBtn = downloadBtn;
  batchItem.compressBtn = compressBtn;
  batchItem.resultInfo = resultInfo;
}

async function selectBatchItem(batchItem) {
  document.querySelectorAll(".batch-item").forEach(item => {
    item.classList.remove("selected");
  });
  
  const itemDiv = document.querySelector(`.batch-item[data-id="${batchItem.id}"]`);
  if (itemDiv) itemDiv.classList.add("selected");
  
  currentFile = batchItem.file;
  currentImageData = batchItem.imageData;
  currentCompressedBlob = batchItem.compressedBlob;
  
  // 批量模式时不显示预览区域，只更新控制面板的默认值
  qualityInput.value = 100;
  qualitySlider.value = 100;
  sizeInput.value = Math.round(batchItem.file.size / 1024);
  widthInput.value = batchItem.imageData.width;
  heightInput.value = batchItem.imageData.height;
  
  // 批量模式下不显示预览区域
  previewArea.style.display = "none";
  compressControls.style.display = "block";
}

async function compressBatchItem(batchItem) {
  try {
    batchItem.compressBtn.disabled = true;
    batchItem.compressBtn.textContent = "压缩中...";
    
    const mode = getCurrentCompressMode();
    let blob;
    
    switch (mode) {
      case "quality": {
        const quality = Number(qualityInput.value) / 100;
        blob = await compressImage(batchItem.file, quality);
        break;
      }
      case "size": {
        const targetSize = Number(sizeInput.value);
        blob = await compressBySize(batchItem.file, targetSize);
        break;
      }
      case "pixel": {
        const maxWidth = Number(widthInput.value);
        const maxHeight = Number(heightInput.value);
        blob = await compressImage(batchItem.file, 0.85, maxWidth, maxHeight);
        break;
      }
    }
    
    batchItem.compressedBlob = blob;
    batchItem.downloadBtn.disabled = false;
    batchItem.compressBtn.disabled = false;
    batchItem.compressBtn.textContent = "压缩";
    
    // 更新列表项中的压缩结果信息
    const img = await blobToImage(blob);
    const ratio = batchItem.file.size > 0 
      ? ((batchItem.file.size - blob.size) / batchItem.file.size * 100).toFixed(1)
      : 0;
    batchItem.resultInfo.textContent = `压缩后: ${formatBytes(blob.size)} · 压缩${ratio}% · ${img.width}×${img.height}px`;
    batchItem.resultInfo.style.display = "block";
    
    // 批量模式下不更新预览区域
    if (currentFile === batchItem.file) {
      currentCompressedBlob = blob;
    }
  } catch (err) {
    console.error("压缩失败:", err);
    setError("压缩失败：" + err.message);
    batchItem.compressBtn.disabled = false;
    batchItem.compressBtn.textContent = "压缩";
  }
}

function downloadBatchItem(batchItem) {
  if (!batchItem.compressedBlob) return;
  const url = URL.createObjectURL(batchItem.compressedBlob);
  const a = document.createElement("a");
  const baseName = batchItem.file.name.replace(/\.[^/.]+$/, "");
  a.href = url;
  a.download = `${baseName}-compressed.jpg`;
  a.click();
  URL.revokeObjectURL(url);
}

function deleteBatchItem(batchItem) {
  if (confirm(`确定要删除 ${batchItem.file.name} 吗？`)) {
    batchFiles = batchFiles.filter(item => item.id !== batchItem.id);
    URL.revokeObjectURL(batchItem.previewUrl);
    const itemDiv = document.querySelector(`.batch-item[data-id="${batchItem.id}"]`);
    if (itemDiv) itemDiv.remove();
    batchCount.textContent = batchFiles.length;
    
    if (currentFile === batchItem.file) {
      if (currentCompressedPreviewUrl) {
        URL.revokeObjectURL(currentCompressedPreviewUrl);
        currentCompressedPreviewUrl = null;
      }
      currentFile = null;
      currentCompressedBlob = null;
      originalPreview.style.display = "none";
      originalPreview.src = "";
      originalInfo.textContent = "-";
      compressedPreview.style.display = "none";
      compressedPreview.src = "";
      compressedInfo.textContent = "-";
      downloadBtn.disabled = true;
      zoomOriginalBtn.style.display = "none";
      deleteOriginalBtn.style.display = "none";
      zoomCompressedBtn.style.display = "none";
    }
    
    if (batchFiles.length === 0) {
      batchListSection.style.display = "none";
    }
  }
}

async function compressAll() {
  if (batchFiles.length === 0) return;
  compressAllBtn.disabled = true;
  compressAllBtn.textContent = "压缩中...";
  
  for (const batchItem of batchFiles) {
    if (!batchItem.compressedBlob) {
      await compressBatchItem(batchItem);
    }
  }
  
  compressAllBtn.disabled = false;
  compressAllBtn.textContent = "压缩全部";
  downloadAllBtn.disabled = false;
}

async function downloadAll() {
  if (typeof JSZip === "undefined") {
    alert("JSZip库未加载");
    return;
  }
  
  const zip = new JSZip();
  let hasFiles = false;
  
  for (const batchItem of batchFiles) {
    if (batchItem.compressedBlob) {
      const baseName = batchItem.file.name.replace(/\.[^/.]+$/, "");
      zip.file(`${baseName}-compressed.jpg`, batchItem.compressedBlob);
      hasFiles = true;
    }
  }
  
  if (!hasFiles) {
    alert("没有已压缩的图片");
    return;
  }
  
  downloadAllBtn.disabled = true;
  downloadAllBtn.textContent = "打包中...";
  
  try {
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "compressed-images.zip";
    a.click();
    URL.revokeObjectURL(url);
  } catch (err) {
    alert("打包失败：" + err.message);
  }
  
  downloadAllBtn.disabled = false;
  downloadAllBtn.textContent = "下载全部 (ZIP)";
}

function clearAll() {
  if (batchFiles.length === 0) return;
  if (confirm(`确定要清空全部 ${batchFiles.length} 张图片吗？`)) {
    for (const batchItem of batchFiles) {
      URL.revokeObjectURL(batchItem.previewUrl);
    }
    batchFiles = [];
    batchList.innerHTML = "";
    batchListSection.style.display = "none";
    batchCount.textContent = "0";
    if (currentCompressedPreviewUrl) {
      URL.revokeObjectURL(currentCompressedPreviewUrl);
      currentCompressedPreviewUrl = null;
    }
    currentFile = null;
    currentCompressedBlob = null;
    originalPreview.style.display = "none";
    originalPreview.src = "";
    originalInfo.textContent = "-";
    compressedPreview.style.display = "none";
    compressedPreview.src = "";
    compressedInfo.textContent = "-";
    downloadBtn.disabled = true;
    zoomOriginalBtn.style.display = "none";
    deleteOriginalBtn.style.display = "none";
    zoomCompressedBtn.style.display = "none";
    compressControls.style.display = "none";
    previewArea.style.display = "none";
  }
}

// 原图放大和删除
zoomOriginalBtn.addEventListener("click", () => {
  if (originalPreview.src) zoomImage(originalPreview.src);
});

deleteOriginalBtn.addEventListener("click", () => {
  if (confirm("确定要删除原图吗？")) {
    if (currentCompressedPreviewUrl) {
      URL.revokeObjectURL(currentCompressedPreviewUrl);
      currentCompressedPreviewUrl = null;
    }
    currentFile = null;
    currentCompressedBlob = null;
    originalPreview.style.display = "none";
    originalPreview.src = "";
    originalInfo.textContent = "-";
    compressedPreview.style.display = "none";
    compressedPreview.src = "";
    compressedInfo.textContent = "-";
    downloadBtn.disabled = true;
    zoomOriginalBtn.style.display = "none";
    deleteOriginalBtn.style.display = "none";
    zoomCompressedBtn.style.display = "none";
    compressControls.style.display = "none";
    previewArea.style.display = "none";
    batchListSection.style.display = "none";
    fileInput.value = "";
  }
});

// 压缩后图片放大
zoomCompressedBtn.addEventListener("click", () => {
  if (compressedPreview.src) zoomImage(compressedPreview.src);
});

// 证件照原图放大和删除
zoomIdphotoOriginalBtn.addEventListener("click", () => {
  if (idphotoOriginalPreview.src) zoomImage(idphotoOriginalPreview.src);
});

deleteIdphotoOriginalBtn.addEventListener("click", () => {
  if (confirm("确定要删除原图吗？")) {
    currentFile = null;
    idphotoOriginalPreview.style.display = "none";
    idphotoOriginalPreview.src = "";
    idphotoOriginalInfo.textContent = "-";
    idphotoPreview.style.display = "none";
    idphotoInfo.textContent = "-";
    downloadIdphotoBtn.disabled = true;
    zoomIdphotoOriginalBtn.style.display = "none";
    deleteIdphotoOriginalBtn.style.display = "none";
    zoomIdphotoBtn.style.display = "none";
    idphotoControls.style.display = "none";
    idphotoPreviewArea.style.display = "none";
    idphotoFileInput.value = "";
  }
});

// 证件照预览放大
zoomIdphotoBtn.addEventListener("click", () => {
  if (idphotoPreview.src) zoomImage(idphotoPreview.src);
});

// 批量操作
compressAllBtn.addEventListener("click", compressAll);
downloadAllBtn.addEventListener("click", downloadAll);
clearAllBtn.addEventListener("click", clearAll);

// 模态框
modalClose.addEventListener("click", closeModal);
imageModal.addEventListener("click", (e) => {
  if (e.target === imageModal || e.target.classList.contains("modal-backdrop")) {
    closeModal();
  }
});

// 批量操作
compressAllBtn.addEventListener("click", compressAll);
downloadAllBtn.addEventListener("click", downloadAll);
clearAllBtn.addEventListener("click", clearAll);

// 初始化
switchTab("compress");
switchCompressMode("quality");

