// Purikura Photo Booth frontend
// - Camera capture (3 shots with 3s countdown)
// - Simple filters
// - Background removal for plain white/black bg (client-side)
// - Compose vertical layout over chosen background
// - Upload final to Flask for shareable link + QR

const el = (sel) => document.querySelector(sel);
const els = (sel) => Array.from(document.querySelectorAll(sel));

const steps = els('#steps .step');
function setStep(n){
  steps.forEach((s,i)=> s.classList.toggle('active', i === n-1));
  els('main section').forEach(sec => sec.classList.add('hidden'));
  el('#step'+n).classList.remove('hidden');
}

let currentFilter = 'none';
let stream = null;
let facing = 'user';
let shots = []; // Array of Image objects (with transparent bg after removal later)
let rawShots = []; // original captures before bg removal
let selectedBg = null;
let composedBlob = null;

// Step 1
el('#goStep2').addEventListener('click', () => {
  currentFilter = (el('input[name=filter]:checked') || {}).value || 'none';
  setStep(2);
  startCamera();
});

// Camera setup
async function startCamera(){
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: facing, width: {ideal: 1080}, height: {ideal: 1440} },
      audio: false
    });
    const video = el('#video');
    video.srcObject = stream;
    await video.play();
    const overlay = el('#overlay');
    overlay.width = video.clientWidth;
    overlay.height = video.clientHeight;
    drawPreviewFilter();
  } catch (err) {
    alert('Camera error: ' + err.message);
  }
}

el('#switchCam').addEventListener('click', () => {
  facing = (facing === 'user' ? 'environment' : 'user');
  startCamera();
});

// Live preview filter (CSS)
function drawPreviewFilter(){
  const video = el('#video');
  const apply = () => {
    let f = 'none';
    if (currentFilter === 'grayscale') f = 'grayscale(1)';
    else if (currentFilter === 'sepia') f = 'sepia(0.8)';
    else if (currentFilter === 'softpink') f = 'contrast(1.05) saturate(1.2) sepia(0.15)';
    video.style.filter = f;
    requestAnimationFrame(apply);
  };
  apply();
}

// Countdown + capture
el('#capture').addEventListener('click', async () => {
    if (rawShots.length >= 3) return;
  await countdown(3);
  const img = await takePhoto();
    if (rawShots.length < 3) {
        rawShots.push(img);
        addThumb(img, rawShots.length - 1);
    }
   
  el('#counter').textContent = rawShots.length + '/3';
  if (rawShots.length >= 3) {
      el('#goStep3').disabled = false;
      updateRetakeButton();
  }
});

function addThumb(img, index) {
    const t = document.createElement('img');
    t.src = img.src;
    t.dataset.index = index;      // ✅ now it's defined
    t.classList.add('thumb-img'); // note lowercase to match your selector
    t.addEventListener('click', () => {
        // deselect all others
        els('.thumb-img').forEach(i => i.classList.remove('selected'));
        t.classList.add('selected');   // highlight the selected thumbnail
        retakeIndex = Number(t.dataset.index); // remember which photo to retake
    });
    el('#thumbs').appendChild(t);
}

// Draw countdown on overlay
async function countdown(n){
  const canvas = el('#overlay');
  const ctx = canvas.getContext('2d');
  for (let i=n; i>=1; i--) {
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 120px system-ui, sans-serif';
    ctx.fillText(String(i), canvas.width/2, canvas.height/2);
    await new Promise(r => setTimeout(r, 1000));
  }
  ctx.clearRect(0,0,canvas.width, canvas.height);
}

// Capture frame with filter into Image
async function takePhoto(){
  const video = el('#video');
  const canvas = document.createElement('canvas');
  // keep 3:4 aspect
  canvas.width = 720;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');

  // Apply canvas filter similar to preview
  if (currentFilter === 'grayscale') ctx.filter = 'grayscale(1)';
  else if (currentFilter === 'sepia') ctx.filter = 'sepia(0.8)';
  else if (currentFilter === 'softpink') ctx.filter = 'contrast(1.05) saturate(1.2) sepia(0.15)';
  else ctx.filter = 'none';

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  // For softpink, add a slight pink overlay
  if (currentFilter === 'softpink') {
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#ffb7d5';
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }

  const img = new Image();
  img.src = canvas.toDataURL('image/png');
  await new Promise(r => img.onload = r);
  return img;
}

function showStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('section.card').forEach(section => {
        section.classList.add('hidden');
    });

    // Remove active highlight from stepper
    document.querySelectorAll('#steps .step').forEach(step => {
        step.classList.remove('active');
    });

    // Show the desired step
    const targetSection = document.querySelector(`#step${stepNumber}`);
    if (targetSection) {
        targetSection.classList.remove('hidden');
    }

    // Highlight the correct step in the stepper
    const targetStepper = document.querySelector(`#steps .step[data-step="${stepNumber}"]`);
    if (targetStepper) {
        targetStepper.classList.add('active');
    }
}


// Step 2 -> Step 3
el('#goStep3').addEventListener('click', () => {
  setStep(3);
});
el('#backBtn')?.addEventListener('click', () => {
    showStep(1); // from Step 2 → Step 1
});


// Select a predefined background
el('#bgList').addEventListener('click', (e) => {
  const target = e.target.closest('.bg-item');
  if (!target) return;
  els('.bg-item').forEach(i=> i.classList.remove('selected'));
  target.classList.add('selected');
    selectedBg = target.dataset.src;
  checkReadyForStep4();
});

// Upload custom background
el('#bgUpload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  // Add to list visually & select it
  const img = document.createElement('img');
  img.src = url;
  img.className = 'bg-item selected';
  img.dataset.src = url;
  el('#bgList').appendChild(img);
  els('.bg-item').forEach(i=> i.classList.remove('selected'));
  img.classList.add('selected');
  selectedBg = url;
  checkReadyForStep4();
});

function checkReadyForStep4(){
  el('#goStep4').disabled = !(selectedBg && rawShots.length === 3);
}
el('#backStep2')?.addEventListener('click', () => {
    showStep(2); // from Step 3 → Step 2
});
// Apply background removal + proceed to layout step
el('#goStep4').addEventListener('click', async () => {
    if (!selectedBg || rawShots.length !== 3) return;
    shots = [...rawShots];       // use original photos
    await composeFinal();        // draw final layout
    setStep(4);
});

// Compose the final 1080x1920 layout
async function composeFinal() {
    const canvas = el('#finalCanvas');
    const ctx = canvas.getContext('2d');

    // Draw chosen background
    if (selectedBg) {
        const bg = new Image();
        bg.src = selectedBg;
        await new Promise(r => bg.onload = r);
        const scale = Math.max(canvas.width / bg.width, canvas.height / bg.height);
        const bw = bg.width * scale;
        const bh = bg.height * scale;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(bg, (canvas.width - bw) / 2, (canvas.height - bh) / 2, bw, bh);
    } else {
        // fallback plain white
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Draw frames + photos (same as before)
    const frameW = Math.floor(canvas.width * 0.95);
    const frameH = Math.floor(canvas.height * 0.25);
    const marginX = Math.floor((canvas.width - frameW) / 2);
    const gapY = Math.floor(canvas.height * 0.05);
    const topY = Math.floor(canvas.height * 0.08);

    const frames = [
        { x: marginX, y: topY },
        { x: marginX, y: topY + frameH + gapY },
        { x: marginX, y: topY + 2 * (frameH + gapY) },
    ];

    ctx.save();
    frames.forEach((f, idx) => {
        const pad = Math.floor(frameW * 0.03);
        const px = f.x + pad;
        const py = f.y + pad;
        const pw = frameW - 2 * pad;
        const ph = frameH - 2 * pad;

        const s = shots[idx];
        if (s) {
            const scale = Math.min(pw / s.naturalWidth, ph / s.naturalHeight);
            const dw = s.naturalWidth * scale;
            const dh = s.naturalHeight * scale;
            ctx.drawImage(s, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
        }
    });
    ctx.restore();
}


// Download final
el('#downloadBtn').addEventListener('click', () => {
  const canvas = el('#finalCanvas');
  const a = document.createElement('a');
  a.download = 'purikura.png';
  a.href = canvas.toDataURL('image/png');
  a.click();
});

// Upload to server (for QR sharable URL)
el('#uploadBtn').addEventListener('click', async () => {
  const canvas = el('#finalCanvas');
  const blob = await new Promise(res => canvas.toBlob(res, 'image/png', 0.95));
  const file = new File([blob], 'purikura.png', {type: 'image/png'});
  const fd = new FormData();
  fd.append('file', file);

  const resp = await fetch('/api/upload', { method: 'POST', body: fd });
  if (!resp.ok) { alert('Upload failed'); return; }
  const data = await resp.json();
  const url = data.url;
  el('#shareLink').textContent = url;
  // Make QR
  el('#qrcode').innerHTML = '';
  new QRCode(el('#qrcode'), { text: url, width: 200, height: 200 });
  alert('QR ready!');
});

el('#backStep3')?.addEventListener('click', () => {
    showStep(3); // from Step 4 → Step 3
});

//retake photoes
let retakeIndex = null; // to track which shot is being retaken

// Enable Retake after 3 shots
function updateRetakeButton() {
    const btn = el('#retake');
    btn.disabled = rawShots.length < 3;
}
el('#retake').addEventListener('click', async () => {
    if (retakeIndex === null) {
        alert('Select the photo you want to retake by clicking its thumbnail.');
        return;
    }

    // retake photo with countdown
    await countdown(3);
    const newImg = await takePhoto();

    // replace in rawShots
    rawShots[retakeIndex] = newImg;

    // update thumbnail
    const thumb = el(`.thumb-img[data-index="${retakeIndex}"]`);
    thumb.src = newImg.src;

    // reset selection
    els('.thumb-img').forEach(i => i.classList.remove('selected'));
    retakeIndex = null;
});


