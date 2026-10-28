"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getAudioUrl } from "@/lib/audio";

export interface LoopVerse {
  surah: number;
  verse: number;
  text: string;
}

interface Options {
  /** Called each time the whole range has been played once. `pass` is 1-based. */
  onPassComplete?: (pass: number) => void;
}

/**
 * Plays a list of ayat in order with one <audio>, repeating the whole range
 * `repeats` times. Shared by the free practice player and the assigned-lesson
 * player. Callers load verses with `start(verses, repeats, reciter)`.
 */
export function useVerseLoop({ onPassComplete }: Options = {}) {
  const [verses, setVerses] = useState<LoopVerse[]>([]);
  const [repeats, setRepeats] = useState(1);
  const [currentRepeat, setCurrentRepeat] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Refs so the "ended" handler always sees current values.
  const versesRef = useRef<LoopVerse[]>([]);
  const repeatsRef = useRef(1);
  const reciterRef = useRef("");
  const activeIdxRef = useRef(0);
  const repeatRef = useRef(1);
  const onPassRef = useRef(onPassComplete);
  useEffect(() => { onPassRef.current = onPassComplete; }, [onPassComplete]);

  const getAudioRef = useRef<() => HTMLAudioElement>(() => new Audio());

  const loadAndPlay = useCallback((idx: number) => {
    const v = versesRef.current[idx];
    if (!v) return;
    const audio = getAudioRef.current();
    activeIdxRef.current = idx;
    setCurrentVerse(idx);
    setAudioError(false);
    audio.src = getAudioUrl(reciterRef.current, v.surah, v.verse);
    audio.currentTime = 0;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, []);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onerror = () => { setPlaying(false); setAudioError(true); };
      audio.onended = () => {
        const list = versesRef.current;
        const idx = activeIdxRef.current;
        if (idx < list.length - 1) {
          loadAndPlay(idx + 1);
          return;
        }
        // Finished one full pass of the range.
        const done = repeatRef.current;
        onPassRef.current?.(done);
        const next = done + 1;
        if (next <= repeatsRef.current) {
          repeatRef.current = next;
          setCurrentRepeat(next);
          loadAndPlay(0);
        } else {
          setPlaying(false);
        }
      };
      audioRef.current = audio;
    }
    return audioRef.current;
  }, [loadAndPlay]);
  useEffect(() => { getAudioRef.current = getAudio; }, [getAudio]);

  function start(list: LoopVerse[], reps: number, reciter: string) {
    versesRef.current = list;
    repeatsRef.current = reps;
    reciterRef.current = reciter;
    activeIdxRef.current = 0;
    repeatRef.current = 1;
    setVerses(list);
    setRepeats(reps);
    setCurrentRepeat(1);
    setCurrentVerse(0);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(false);
    setPlaying(false);
    if (audioRef.current) audioRef.current.pause();
  }

  function togglePlay() {
    const audio = getAudio();
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (audio.src && activeIdxRef.current === currentVerse) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      loadAndPlay(currentVerse);
    }
  }

  function goTo(idx: number) {
    const clamped = Math.max(0, Math.min(verses.length - 1, idx));
    if (playing) {
      loadAndPlay(clamped);
      return;
    }
    activeIdxRef.current = clamped;
    setCurrentVerse(clamped);
    setCurrentTime(0);
    setDuration(0);
    const audio = getAudio();
    const v = verses[clamped];
    if (v) {
      audio.src = getAudioUrl(reciterRef.current, v.surah, v.verse);
      audio.load();
    }
  }

  function stop() {
    if (audioRef.current) audioRef.current.pause();
    setPlaying(false);
  }

  // Keep the active ayah in view as playback advances.
  const activeVerseRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    activeVerseRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentVerse]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current = null;
      }
    };
  }, []);

  return {
    verses, repeats, currentRepeat, playing, currentVerse,
    currentTime, duration, audioError, activeVerseRef,
    start, stop, togglePlay, goTo,
  };
}

export function formatTime(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}
