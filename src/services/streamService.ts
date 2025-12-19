import axios from "axios";

export const MTX_HOST = "192.168.17.43"; // IP MediaMTX
export const PORT = 8080; // webrtcAddress
export const MTX_PORT = 8889; // webrtcAddress

export const PATH_NAME = "p_se3qwd5idgv1t"; // path đã tạo
export const VIEWER_USER = "viewer"; // user read
export const VIEWER_PASS = "viewer123"; // pass read

export const createStream = async (inputUrl: string) => {
  try {
    const response = await axios.post(
      // `http://${MTX_HOST}:${PORT}/api/streams`,
      `/api/streams`,
      {
        inputUrl,
        onDemand: true,
        rtspTransport: "tcp",
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
  try {
    const response = await axios.get(
      `http://192.168.17.43:8999/api/videos?cameraId=cam_record_02&date=2025-12-19`,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message;
  }
};
