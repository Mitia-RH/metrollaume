document.addEventListener('DOMContentLoaded', () => {
    const startAudioOverlay = document.getElementById('start-audio-overlay');
    const startAudioButton = document.getElementById('start-audio-button');
    const playPauseButton = document.getElementById('play-pause-button');
    const bpmSlider = document.getElementById('bpm');
    const bpmValue = document.getElementById('bpm-value');
    const fileInputs = document.querySelectorAll('.file-input');
    const volumeSliders = document.querySelectorAll('.volume-slider');

    let audioContext;
    let isPlaying = false;
    let bpm = 120;
    let currentBeat = 0;
    let nextNoteTime = 0.0;
    let timerID;
    const scheduleAheadTime = 0.1; // seconds
    const lookahead = 25.0; // ms

    const audioBuffers = new Array(4).fill(null);
    const gainNodes = new Array(4).fill(null);

    function initAudio() {
        if (audioContext) return;
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        for (let i = 0; i < 4; i++) {
            gainNodes[i] = audioContext.createGain();
            gainNodes[i].connect(audioContext.destination);
        }
    }

    function loadDefaultSounds() {
        const soundFiles = ['click1.wav', 'click2.wav', 'click3.wav', 'click4.wav'];
        soundFiles.forEach((file, index) => {
            fetch(file)
                .then(response => response.arrayBuffer())
                .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                    audioBuffers[index] = buffer;
                    const fileLabel = document.querySelector(`label[for="file-${index + 1}"]`);
                    fileLabel.textContent = file;
                }, error => console.error(error)));
        });
    }

    startAudioButton.addEventListener('click', () => {
        initAudio();
        loadDefaultSounds();
        startAudioOverlay.style.display = 'none';
    });

    playPauseButton.addEventListener('click', () => {
        if (!audioContext) {
            alert('Please start the audio first.');
            return;
        }
        isPlaying = !isPlaying;
        if (isPlaying) {
            playPauseButton.textContent = 'Pause';
            currentBeat = 0;
            nextNoteTime = audioContext.currentTime + 0.1;
            scheduler();
        } else {
            playPauseButton.textContent = 'Play';
            clearTimeout(timerID);
        }
    });

    bpmSlider.addEventListener('input', (e) => {
        bpm = parseInt(e.target.value, 10);
        bpmValue.textContent = bpm;
    });

    volumeSliders.forEach((slider, index) => {
        slider.addEventListener('input', (e) => {
            if (gainNodes[index]) {
                gainNodes[index].gain.value = parseFloat(e.target.value);
            }
        });
    });

    fileInputs.forEach((input, index) => {
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (loadEvent) => {
                    audioContext.decodeAudioData(loadEvent.target.result, (buffer) => {
                        audioBuffers[index] = buffer;
                        const fileLabel = document.querySelector(`label[for="file-${index + 1}"]`);
                        fileLabel.textContent = file.name.substring(0, 15) + '...';
                    }, (error) => console.error(`Error decoding audio data: ${error.err}`));
                };
                reader.readAsArrayBuffer(file);
            }
        });
    });

    function scheduler() {
        while (nextNoteTime < audioContext.currentTime + scheduleAheadTime) {
            scheduleNote(currentBeat, nextNoteTime);
            nextNoteTime += 60.0 / bpm;
            currentBeat = (currentBeat + 1) % 4;
        }
        timerID = setTimeout(scheduler, lookahead);
    }

    function scheduleNote(beat, time) {
        if (audioBuffers[beat]) {
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffers[beat];
            source.connect(gainNodes[beat]);
            source.start(time);
        }
    }
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
        .then((reg) => {
          console.log('Service worker registered.', reg);
        });
    }
});
