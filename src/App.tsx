import { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [files, setFiles] = useState<File[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [playOrder, setPlayOrder] = useState<File[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [folderName, setFolderName] = useState<string>("");

  useEffect(() => {
    const saveStateToLocalStorage = () => {
      const state = {
        currentFile: currentFile ? currentFile.name : null,
        currentIndex,
        playOrder: playOrder.map((file) => file.name),
      };
      console.log("セーブ: ", state);
      localStorage.setItem("musicPlayerState", JSON.stringify(state));
    };

    if (currentFile && currentIndex !== undefined && playOrder.length > 0) {
      saveStateToLocalStorage();
    }
  }, [currentFile, currentIndex, playOrder]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && audio && isPlaying) {
        audio.play();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [audio, isPlaying]);

  const loadStateFromLocalStorage = () => {
    const state = localStorage.getItem("musicPlayerState");
    if (state) {
      const { currentFile, currentIndex, playOrder } = JSON.parse(state);
      const order = playOrder
        .map((fileName: string) => files.find((file) => file.name === fileName))
        .filter(Boolean) as File[];
      setPlayOrder(order);

      const file = files.find((file) => file.name === currentFile) || null;
      setCurrentFile(file);
      setCurrentIndex(currentIndex);

      if (file) {
        const audioUrl = URL.createObjectURL(file);
        const newAudio = new Audio(audioUrl);
        setAudio(newAudio);
        newAudio.play();
        setIsPlaying(true);

        newAudio.onended = () => {
          playNextSong(order, currentIndex + 1);
        };
        newAudio.ontimeupdate = () => setCurrentTime(newAudio.currentTime);
        newAudio.onloadedmetadata = () => setDuration(newAudio.duration);

        newAudio.onplay = () => setIsPlaying(true);
        newAudio.onpause = () => setIsPlaying(false);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    const audioFiles = selectedFiles.filter((file) =>
      file.name.endsWith(".mp3")
    );
    setFiles(audioFiles);
    setFolderName("選択されたファイル");
  };

  const handleDirectorySelect = async () => {
    try {
      const dirHandle = await (window as any).showDirectoryPicker();
      const audioFiles: File[] = [];
      for await (const entry of dirHandle.values()) {
        if (entry.kind === "file" && entry.name.endsWith(".mp3")) {
          const file = await entry.getFile();
          audioFiles.push(file);
        }
      }
      setFiles(audioFiles);
      setFolderName(dirHandle.name);
    } catch (error) {
      console.error("ディレクトリ選択エラー: ", error);
    }
  };

  const playRandomSong = () => {
    if (files.length === 0) return;
    const shuffledFiles = [...files].sort(() => Math.random() - 0.5);
    setPlayOrder(shuffledFiles);
    playNextSong(shuffledFiles, 0);
  };

  const playNextSong = (order: File[], index: number) => {
    if (index >= order.length) return;
    const nextFile = order[index];
    setCurrentFile(nextFile);
    setCurrentIndex(index);

    const audioUrl = URL.createObjectURL(nextFile);
    if (audio) {
      audio.pause();
      URL.revokeObjectURL(audio.src);
    }
    const newAudio = new Audio(audioUrl);
    setAudio(newAudio);
    newAudio.play();
    setIsPlaying(true);

    newAudio.onended = () => {
      playNextSong(order, index + 1);
    };
    newAudio.ontimeupdate = () => setCurrentTime(newAudio.currentTime);
    newAudio.onloadedmetadata = () => setDuration(newAudio.duration);

    newAudio.onplay = () => setIsPlaying(true);
    newAudio.onpause = () => setIsPlaying(false);
  };

  const playPreviousSong = () => {
    if (currentIndex > 0) {
      playNextSong(playOrder, currentIndex - 1);
    }
  };

  const playNext = () => {
    if (currentIndex < playOrder.length - 1) {
      playNextSong(playOrder, currentIndex + 1);
    }
  };

  const togglePlayPause = () => {
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  };

  return (
    <div>
      <h1>Music Player</h1>
      {"showDirectoryPicker" in window ? (
        <button onClick={handleDirectorySelect}>フォルダを選択</button>
      ) : (
        <input type="file" multiple accept=".mp3" onChange={handleFileSelect} />
      )}
      <br />
      {folderName && <p>選択されたフォルダ: {folderName}</p>}
      <button onClick={loadStateFromLocalStorage}>ロード</button>
      <button onClick={playRandomSong}>ランダム再生</button>
      <button onClick={playPreviousSong}>前の曲</button>
      <button onClick={togglePlayPause}>{isPlaying ? "停止" : "再生"}</button>
      <button onClick={playNext}>次の曲</button>
      {currentFile && <p>再生中: {currentFile.name}</p>}
      {currentFile && (
        <div>
          <p>
            {formatTime(currentTime)} / {formatTime(duration)}
          </p>
          <input
            type="range"
            min="0"
            max={duration}
            value={currentTime}
            onChange={(e) => {
              if (audio) {
                audio.currentTime = Number(e.target.value);
                setCurrentTime(audio.currentTime);
              }
            }}
          />
        </div>
      )}
      <ul>
        {playOrder.map((file, index) => (
          <li key={index} className={file === currentFile ? "playing" : ""}>
            {file.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
