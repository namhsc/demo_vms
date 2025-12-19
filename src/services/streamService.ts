import axios from "axios";
import { VideoSegment } from "../app/App";

export const MTX_HOST = "192.168.17.43"; // IP MediaMTX
export const PORT = 8080;
export const MTX_PORT = 8999;

export const PATH_NAME = "p_se3qwd5idgv1t"; // path đã tạo
export const VIEWER_USER = "viewer"; // user read
export const VIEWER_PASS = "viewer123"; // pass read

export const createStream = async (
  inputUrl: string,
  isRecording: boolean | null
) => {
  try {
    console.log("aaaa", `http://${MTX_HOST}:${MTX_PORT}/api/streams`);
    const response = await axios.post(
      `http://${MTX_HOST}:${MTX_PORT}/api/streams`,
      // `/api/streams`,
      {
        inputUrl,
        onDemand: true,
        rtspTransport: "tcp",
        record: isRecording,
      },
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

export const getListStream = async (camId: string) => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  try {
    const response = await axios.get(
      // `http://${MTX_HOST}:${MTX_PORT}/api/videos?cameraId=${camId}&date=2025-12-19`,
      `/api/videos?cameraId=${camId}&date=${today}`,
      { headers: { "Content-Type": "application/json" } }
    );

    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};

const parseTimeFromFileName = (fileName: string) => {
  const [hh, mm, ss] = fileName.replace(".mp4", "").split("-").map(Number);
  return { hh, mm, ss };
};

const toSecondsFromStartOfDay = (date: Date) => {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds();
};

interface RecordVideoApi {
  fileName: string;
  createdAt: string; // ISO
  url: string;
  durationSec?: number | null;
}

export const createSegmentsFromRecordList = (
  records: RecordVideoApi[]
): VideoSegment[] => {
  const segments: VideoSegment[] = [];
  records.forEach((record, index) => {
    /** 1. Parse start time từ fileName */
    const { hh, mm, ss } = parseTimeFromFileName(record.fileName);

    const startSeconds = (hh + 7) * 3600 + mm * 60 + ss;

    /** 2. Parse end time từ createdAt +7 */
    const endDate = new Date(record.createdAt);
    endDate.setHours(endDate.getHours() + 7);

    const endSeconds = toSecondsFromStartOfDay(endDate);

    /** 3. Validate */
    if (endSeconds <= startSeconds) {
      console.warn("Invalid segment:", record.fileName);
      return;
    }

    segments.push({
      index,
      start: startSeconds,
      end: endSeconds,
      src: record.url,
      fileName: record.fileName,
      createdAt: record.createdAt,
    });
  });

  return segments.sort((a, b) => a.start - b.start);
};
