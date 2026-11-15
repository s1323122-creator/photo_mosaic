const galleryList = document.getElementById("galleryList");
const galleryStatus = document.getElementById("galleryStatus");
const emptyGallery = document.getElementById("emptyGallery");
const retryGallery = document.getElementById("retryGallery");
let galleryUrls = [];
let loading = false;
let deleting = false;

async function showGallery() {
  if (loading || deleting) return;
  loading = true;
  retryGallery.hidden = true;
  emptyGallery.hidden = true;
  galleryStatus.textContent = "作品を読み込んでいます…";
  try {
    const works = await Artworks.list();
    works.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    galleryList.replaceChildren();
    galleryUrls.forEach(url => URL.revokeObjectURL(url));
    galleryUrls = [];
    works.forEach(work => {
      const card = document.createElement("article");
      card.className = "work-card";
      const url = URL.createObjectURL(work.blob);
      galleryUrls.push(url);
      const date = new Date(work.createdAt).toLocaleString("ja-JP", {
        year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
      });
      const image = document.createElement("img");
      image.src = url;
      image.alt = `${date}のおさんぽモザイク`;
      image.width = image.height = 1200;
      image.loading = "lazy";
      const details = document.createElement("div");
      details.className = "work-details";
      const title = document.createElement("h2");
      title.textContent = "おさんぽの思い出";
      const time = document.createElement("time");
      time.dateTime = work.createdAt;
      time.textContent = date;
      const count = document.createElement("p");
      count.textContent = `${work.count}枚の写真でできた作品`;
      const download = document.createElement("a");
      download.href = url;
      download.download = Artworks.filename(work);
      download.className = "secondary-link";
      download.textContent = "画像を保存";
      download.setAttribute("aria-label", `${date}の作品の画像を保存`);
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "secondary-link delete-work";
      remove.textContent = "作品を削除";
      remove.setAttribute("aria-label", `${date}の作品を削除`);
      remove.addEventListener("click", async () => {
        if (loading || deleting) return;
        if (!window.confirm(`${date}の作品を削除しますか？\n削除した作品は元に戻せません。端末に保存した画像は残ります。`)) return;
        deleting = true;
        remove.disabled = true;
        remove.textContent = "削除しています…";
        try {
          await Artworks.remove(work.id);
          const nextFocus = card.nextElementSibling?.querySelector(".delete-work")
            || card.previousElementSibling?.querySelector(".delete-work");
          card.remove();
          URL.revokeObjectURL(url);
          galleryUrls = galleryUrls.filter(item => item !== url);
          const remaining = galleryList.children.length;
          emptyGallery.hidden = remaining !== 0;
          galleryStatus.textContent = remaining
            ? `作品を削除しました。${remaining}作品の思い出が集まっています。`
            : "作品を削除しました。まだ作品がありません。";
          (nextFocus || emptyGallery.querySelector("a")).focus();
        } catch (error) {
          console.error(error);
          galleryStatus.textContent = "作品を削除できませんでした。もう一度お試しください。";
          remove.disabled = false;
          remove.textContent = "作品を削除";
        } finally {
          deleting = false;
        }
      });
      details.append(title, time, count, download, remove);
      card.append(image, details);
      galleryList.append(card);
    });
    emptyGallery.hidden = works.length !== 0;
    galleryStatus.textContent = works.length ? `${works.length}作品の思い出が集まりました。` : "まだ作品がありません。";
  } catch (error) {
    console.error(error);
    galleryStatus.textContent = "作品を読み込めませんでした。もう一度お試しください。";
    retryGallery.hidden = false;
  } finally {
    loading = false;
  }
}

retryGallery.addEventListener("click", showGallery);
// Refresh on return from another page, including the browser's back cache.
window.addEventListener("pageshow", showGallery);
