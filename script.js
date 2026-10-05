
const cells = document.querySelectorAll(".cell");
const completeBtn = document.getElementById("completeBtn");
const resetBtn = document.getElementById("resetBtn");
const status = document.getElementById("status");

const cameraModal = document.getElementById("cameraModal");
const cameraPreview = document.getElementById("cameraPreview");
const cameraMessage = document.getElementById("cameraMessage");
const takePhotoBtn = document.getElementById("takePhotoBtn");
const cancelCameraBtn = document.getElementById("cancelCameraBtn");
const photoCanvas = document.getElementById("photoCanvas");
const cameraGuide = document.getElementById("cameraGuide");

let completed = false;
let selectedCell = null;
let cameraStream = null;

const STORAGE_KEY = "photoMosaicPhotos";

function loadPhotos() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return Array(9).fill(null);

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed) || parsed.length !== 9) {
      return Array(9).fill(null);
    }

    return parsed.map((photo) =>
      typeof photo === "string" && photo.startsWith("data:image/")
        ? photo
        : null
    );
  } catch (error) {
    console.error("保存データを読み込めませんでした", error);
    return Array(9).fill(null);
  }
}

let photos = loadPhotos();

function savePhotos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
    return true;
  } catch (error) {
    console.error("写真を保存できませんでした", error);
    status.textContent =
      "保存できませんでした。写真の容量が大きすぎる可能性があります。";
    return false;
  }
}

function displaySavedPhotos() {
  cells.forEach((cell, index) => {
    cell.style.backgroundImage = photos[index]
      ? `url("${photos[index]}")`
      : "";
  });
}

displaySavedPhotos();


async function openCamera(cell) {
  if (completed) return;

  selectedCell = cell;
  const index = Number(cell.dataset.index);
  const positions = [
    ["0%", "0%"], ["50%", "0%"], ["100%", "0%"],
    ["0%", "50%"], ["50%", "50%"], ["100%", "50%"],
    ["0%", "100%"], ["50%", "100%"], ["100%", "100%"]
];

cameraGuide.style.backgroundPosition =
  `${positions[index][0]} ${positions[index][1]}`;

  cameraModal.hidden = false;
  cameraMessage.textContent = "カメラを準備しています...";
  takePhotoBtn.disabled = true;

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error(
        "このページではカメラを利用できません。HTTPSまたはlocalhostで開いてください。"
      );
    }

    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment"
      },
      audio: false
    });

    cameraPreview.srcObject = cameraStream;
    await cameraPreview.play();

    cameraMessage.textContent = "準備完了！撮影ボタンを押してください。";
    takePhotoBtn.disabled = false;
  } catch (error) {
    console.error(error);
    cameraMessage.textContent =
      error.name === "NotAllowedError"
        ? "カメラが許可されていません。ブラウザの設定でカメラを許可してください。"
        : error.message || "カメラを起動できませんでした。";
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  cameraPreview.srcObject = null;
  cameraModal.hidden = true;
  takePhotoBtn.disabled = true;
}

cells.forEach((cell) => {
  cell.addEventListener("click", () => {
    openCamera(cell);
  });
});

takePhotoBtn.addEventListener("click", () => {
  if (!cameraStream || !selectedCell) return;

  const width = cameraPreview.videoWidth;
  const height = cameraPreview.videoHeight;

  if (!width || !height) {
    cameraMessage.textContent = "カメラの準備ができるまでお待ちください。";
    return;
  }

  photoCanvas.width = width;
  photoCanvas.height = height;

  const context = photoCanvas.getContext("2d");
  context.drawImage(cameraPreview, 0, 0, width, height);

  const photoData = photoCanvas.toDataURL("image/jpeg", 0.85);
  const index = Number(selectedCell.dataset.index);

  photos[index] = photoData;
  selectedCell.style.backgroundImage = `url("${photoData}")`;
  savePhotos();

  status.textContent = `${index + 1}マス目に写真を入れました。`;

  stopCamera();
  selectedCell = null;
});

cancelCameraBtn.addEventListener("click", () => {
  stopCamera();
  selectedCell = null;
});

completeBtn.addEventListener("click", () => {
  completed = true;
  stopCamera();
  selectedCell = null;

  document.body.classList.add("completed");

  const count = photos.filter((photo) => photo !== null).length;

  status.textContent =
    `作品が完成しました！ ${count} / 9 マスに写真が入っています。`;
});


resetBtn.addEventListener("click", () => {
  stopCamera();
  selectedCell = null;
  completed = false;
  photos = Array(9).fill(null);
  localStorage.removeItem(STORAGE_KEY);

  cells.forEach((cell) => {
    cell.style.backgroundImage = "";
  });

  document.body.classList.remove("completed");
  status.textContent = "リセットしました。写真を集めましょう！";
});

window.addEventListener("beforeunload", stopCamera);
