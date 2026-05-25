const { app, BrowserWindow, shell, ipcMain, dialog , nativeTheme , Menu  } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

// پیدا کردن مسیر VLC
const getVlcPath = () => {
  const possiblePaths = [
    'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
    'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe'
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
};

// تابع اجرای VLC با منطق درست برای لینک‌های سریال
const openWithVLC = (url) => {
  const vlcPath = getVlcPath();
  if (!vlcPath) {
    dialog.showErrorBox("خطا", "پلیر VLC پیدا نشد.");
    return;
  }

  // اضافه کردن Referer برای اینکه سرور فکر کنه از خودِ سایت اومدی
  const args = [
    url,
    '--fullscreen',
    '--no-qt-name-in-title',
    '--http-referrer=https://iran-onemovies-dcenter.com/',
    '--http-user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  ];

  try {
    const vlcProcess = spawn(vlcPath, args, { detached: true, stdio: 'ignore' });
    vlcProcess.unref();
  } catch (err) {
    console.error("خطا در اجرای VLC:", err);
  }
};


Menu.setApplicationMenu(null);

function createWindow() {
  
    const win = new BrowserWindow({
    width: 1200, height: 800,
    // frame: false,
    // titleBarStyle: 'hidden',
    // این خط رو اضافه کن (مطمئن شو مسیر فایل‌های .ico درسته)
    icon: nativeTheme.shouldUseDarkColors 
          ? path.join(__dirname, 'assets', 'icon.ico') 
          : path.join(__dirname, 'assets', 'icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  win.loadFile('index.html');

  // استفاده از منطق دقیق تو برای تشخیص لینک‌های سریال
  win.webContents.setWindowOpenHandler(({ url }) => {
    const lowerUrl = url.toLowerCase();
    if (
      lowerUrl.endsWith('.mkv') || 
      lowerUrl.endsWith('.mp4') || 
      lowerUrl.includes('.mkv?') || 
      lowerUrl.includes('.mp4?')
    ) {
      openWithVLC(url);
      return { action: 'deny' };
    }
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(createWindow);

// هندلر IPC که تو ازش استفاده می‌کنی
ipcMain.on('open-vlc', (event, videoUrl) => {
  openWithVLC(videoUrl);
});

// مابقی توابع (fetch-episodes و download-video) دقیقاً همون‌هایی هستن که داشتی
ipcMain.handle('download-video', async (event, videoUrl) => {
  await shell.openExternal(videoUrl);
  return { success: true };
});

ipcMain.handle('fetch-episodes', async (event, folderUrl) => {
  try {
    const baseUrl = folderUrl.endsWith('/') ? folderUrl : folderUrl + '/';
    const { data } = await axios.get(baseUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const $ = cheerio.load(data);
    let episodes = [];
    let subFolders = [];

    $('a').each((i, el) => {
      const href = $(el).attr('href');
      if (!href || href === '../' || href.startsWith('?')) return;
      if (href.toLowerCase().endsWith('.mkv') || href.toLowerCase().endsWith('.mp4')) {
        episodes.push({ title: decodeURIComponent(href.split('/').pop()), url: baseUrl + href });
      } else if (href.endsWith('/')) {
        subFolders.push(baseUrl + href);
      }
    });

    if (episodes.length === 0) {
      for (const folder of subFolders) {
        try {
          const subRes = await axios.get(folder, { headers: { 'User-Agent': 'Mozilla/5.0' } });
          const $$ = cheerio.load(subRes.data);
          $$('a').each((i, el) => {
            const href = $$(el).attr('href');
            if (href && (href.toLowerCase().endsWith('.mkv') || href.toLowerCase().endsWith('.mp4'))) {
              episodes.push({ title: decodeURIComponent(href.split('/').pop()), url: folder + href });
            }
          });
        } catch (e) {}
      }
    }
    return episodes;
  } catch (err) {
    return [];
  }
});


