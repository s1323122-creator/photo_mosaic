
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
const completedActions = document.getElementById("completedActions");
const downloadWork = document.getElementById("downloadWork");
const completedPreview = document.getElementById("completedPreview");
let workUrl = null;
let pendingWork = null;
let savingWork = false;

let completed = false;
let selectedCell = null;
let cameraStream = null;
let cameraRequest = null;
let cameraSession = 0;
let cameraView = 0;
const cameraSessionNotice = document.getElementById("cameraSessionNotice");
const endCameraBtn = document.getElementById("endCameraBtn");

function hasLiveCamera() {
  return cameraStream?.getVideoTracks().some(track => track.readyState === "live");
}

async function getCameraStream() {
  if (hasLiveCamera()) return cameraStream;
  if (cameraRequest) return cameraRequest;
  cameraStream?.getTracks().forEach(track => track.stop());
  cameraStream = null;
  const session = cameraSession;
  const request = navigator.mediaDevices.getUserMedia({
    video: { facingMode: "environment" }, audio: false
  }).then(stream => {
    // A permission response may arrive after reset, navigation or backgrounding.
    if (session !== cameraSession || document.hidden) {
      stream.getTracks().forEach(track => track.stop());
      return null;
    }
    cameraStream = stream;
    cameraSessionNotice.hidden = false;
    return stream;
  });
  cameraRequest = request;
  try {
    return await request;
  } finally {
    if (cameraRequest === request) cameraRequest = null;
  }
}

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
  if (completed || document.hidden) return;
  const view = ++cameraView;

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

    const stream = await getCameraStream();
    if (!stream || view !== cameraView || cameraModal.hidden) return;
    cameraPreview.srcObject = stream;
    await cameraPreview.play();
    if (view !== cameraView || cameraModal.hidden) return;

    cameraMessage.textContent = "準備完了！撮影ボタンを押してください。";
    takePhotoBtn.disabled = false;
  } catch (error) {
    if (view !== cameraView || cameraModal.hidden) return;
    console.error(error);
    cameraMessage.textContent =
      error.name === "NotAllowedError"
        ? "カメラが許可されていません。ブラウザの設定でカメラを許可してください。"
        : error.message || "カメラを起動できませんでした。";
  }
}

function closeCamera() {
  cameraView++;
  cameraPreview.pause();
  cameraPreview.srcObject = null;
  cameraModal.hidden = true;
  takePhotoBtn.disabled = true;
  selectedCell = null;
}

function stopCamera() {
  cameraSession++;
  cameraRequest = null;
  closeCamera();
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }

  cameraSessionNotice.hidden = true;
}

cells.forEach((cell) => {
  cell.addEventListener("click", () => {
    openCamera(cell);
  });
});

takePhotoBtn.addEventListener("click", () => {
  if (!hasLiveCamera() || !selectedCell || takePhotoBtn.disabled) return;

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
  if (savePhotos()) {
    status.textContent = `${index + 1}マス目に写真を入れました。`;
  }

  closeCamera();
  selectedCell = null;
});

cancelCameraBtn.addEventListener("click", () => {
  closeCamera();
  selectedCell = null;
});

endCameraBtn.addEventListener("click", stopCamera);

completeBtn.addEventListener("click", async () => {
  if (savingWork || (completed && !pendingWork)) return;
  const count = photos.filter((photo) => photo !== null).length;
  if (count === 0) {
    status.textContent = "まずは写真を1枚撮ってみましょう。";
    return;
  }
  savingWork = true;
  completeBtn.disabled = true;
  resetBtn.disabled = true;
  completed = true;
  stopCamera();
  selectedCell = null;
  status.textContent = "作品を1枚の画像にして保存しています…";
  try {
    if (!pendingWork) {
      const blob = await Artworks.compose(photos.slice());
      pendingWork = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        createdAt: new Date().toISOString(), count, blob
      };
      if (workUrl) URL.revokeObjectURL(workUrl);
      workUrl = URL.createObjectURL(blob);
      downloadWork.href = workUrl;
      completedPreview.src = workUrl;
      completedPreview.hidden = false;
      downloadWork.download = Artworks.filename(pendingWork);
      completedActions.hidden = false;
      document.body.classList.add("completed");
    }
    await Artworks.save(pendingWork);
    pendingWork = null;
    status.textContent = `作品を一覧に保存しました！ ${count} / 9 マスの思い出です。`;
    completeBtn.textContent = "作品を保存しました";
  } catch (error) {
    console.error(error);
    status.textContent = pendingWork
      ? "作品一覧に保存できませんでした。画像を端末に保存するか、もう一度保存をお試しください。"
      : error.name === "SecurityError"
        ? "ブラウザの制限で画像を作成できませんでした。ページを再読み込みしてお試しください。"
        : error.message || "画像を作成できませんでした。もう一度お試しください。";
    completeBtn.textContent = "もう一度保存する";
    if (!pendingWork) completed = false;
  } finally {
    savingWork = false;
    completeBtn.disabled = completed && !pendingWork;
    resetBtn.disabled = false;
  }
});


resetBtn.addEventListener("click", () => {
  if (savingWork) return;
  stopCamera();
  selectedCell = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error(error);
    status.textContent = "保存中の写真をリセットできませんでした。もう一度お試しください。";
    displaySavedPhotos();
    return;
  }
  completed = false;
  photos = Array(9).fill(null);
  pendingWork = null;
  if (workUrl) URL.revokeObjectURL(workUrl);
  workUrl = null;
  completedActions.hidden = true;
  downloadWork.removeAttribute("href");
  completedPreview.hidden = true;
  completedPreview.removeAttribute("src");
  completeBtn.disabled = false;
  completeBtn.textContent = "作品を完成させる ↗";

  cells.forEach((cell) => {
    cell.style.backgroundImage = "";
  });

  document.body.classList.remove("completed");
  status.textContent = "リセットしました。写真を集めましょう！";
});

window.addEventListener("beforeunload", stopCamera);
window.addEventListener("pagehide", stopCamera);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCamera();
});
