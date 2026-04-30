/**
 * Forked and refactored version https://www.npmjs.com/package/@wmik/use-media-recorder
 *
 * The original version caused flickering because of missing useCallbacks on hook functions.
 * This is also simplifying the logic to be more simplified based on the needs of this project.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Checks whether the argument is a valid object i.e (key-value pair).
 * @param {any} o
 */
function isObject(o) {
  return o && !Array.isArray(o) && Object(o) === o;
}

/**
 * Checks whether media type(audio/video) constraints are valid.
 * @param {MediaStreamConstraints} mediaType
 */
const validateMediaTrackConstraints = (mediaType) => {
  let supportedMediaConstraints = null;

  if (navigator.mediaDevices) {
    supportedMediaConstraints = navigator.mediaDevices.getSupportedConstraints();
  }

  if (supportedMediaConstraints === null) {
    return;
  }

  const unSupportedMediaConstraints = Object.keys(mediaType).filter(
    (constraint) => !supportedMediaConstraints[constraint],
  );

  if (unSupportedMediaConstraints.length !== 0) {
    const toText = unSupportedMediaConstraints.join(',');
    console.error(`The following constraints ${toText} are not supported on this browser.`);
  }
};

const noop = () => {};

/**
 * @callback Callback
 * @param {Blob} blob
 *
 * @callback ErrorCallback
 * @param {Error} error
 *
 * @typedef MediaRecorderProps
 * @type {Object}
 * @property {BlobPropertyBag} [blobOptions]
 * @property {Boolean} [recordScreen]
 * @property {MediaStream} [customMediaStream]
 * @property {Function} [onStart]
 * @property {Callback} [onStop]
 * @property {Callback} [onDataAvailable]
 * @property {ErrorCallback} [onError]
 * @property {Object} [mediaRecorderOptions]
 * @property {MediaStreamConstraints} mediaStreamConstraints
 *
 * @typedef MediaRecorderHookOptions
 * @type {Object}
 * @property {?Error} error
 * @property {('idle'|'acquiring_media'|'ready'|'recording'|'paused'|'stopping'|'stopped'|'failed')} status
 * @property {?Blob} mediaBlob
 * @property {Boolean} isAudioMuted
 * @property {Function} stopRecording,
 * @property {Function} getMediaStream,
 * @property {Function} clearMediaStream,
 * @property {Function} clearMediaBlob,
 * @property {Function} startRecording,
 * @property {Function} pauseRecording,
 * @property {Function} resumeRecording,
 * @property {Function} muteAudio
 * @property {Function} unMuteAudio
 * @property {?MediaStream} liveStream
 *
 * Creates a custom media recorder object using the MediaRecorder API.
 * @param {MediaRecorderProps}
 * @returns {MediaRecorderHookOptions}
 */
const useMediaRecorder = ({
  blobOptions,
  recordScreen,
  customMediaStream,
  onStop = noop,
  onStart = noop,
  onError = noop,
  mediaRecorderOptions,
  // onDataAvailable = noop,
  mediaStreamConstraints = {},
}) => {
  const mediaChunks = useRef([]);
  const mediaStream = useRef(null);
  const mediaRecorder = useRef(null);
  const [status, setStatus] = useState('idle');
  const [errorCache, cacheError] = useState(null);
  const [mediaBlobCache, cacheMediaBlob] = useState(null);
  const [isAudioMutedCache, cacheIsAudioMuted] = useState(false);
  const [liveStream, setLiveStream] = useState(null);

  const getMediaStream = useCallback(async () => {
    if (errorCache) {
      cacheError(null);
    }

    setStatus('acquiring_media');

    if (customMediaStream && customMediaStream instanceof MediaStream) {
      mediaStream.current = customMediaStream;
      return;
    }

    try {
      let stream;

      if (recordScreen) {
        stream = await window.navigator.mediaDevices.getDisplayMedia(mediaStreamConstraints);
      } else {
        stream = await window.navigator.mediaDevices.getUserMedia(mediaStreamConstraints);
      }

      if (recordScreen && mediaStreamConstraints.audio) {
        const audioStream = await window.navigator.mediaDevices.getUserMedia({
          audio: mediaStreamConstraints.audio,
        });

        audioStream.getAudioTracks().forEach((audioTrack) => stream.addTrack(audioTrack));
      }

      mediaStream.current = stream;
      setLiveStream(stream ? new MediaStream(mediaStream.current.getVideoTracks()) : null);

      setStatus('ready');
    } catch (err) {
      cacheError(err);
      setStatus('failed');
    }
  }, [customMediaStream, errorCache, mediaStreamConstraints, recordScreen]);

  const clearMediaStream = useCallback(() => {
    if (mediaStream.current) {
      mediaStream.current.getTracks().forEach((track) => track.stop());
      mediaStream.current = null;
      setLiveStream(null);
    }
  }, []);

  const handleStop = useCallback(() => {
    const [sampleChunk] = mediaChunks.current;
    if (sampleChunk) {
      const blobPropertyBag = { type: sampleChunk.type, ...blobOptions };
      const blob = new Blob(mediaChunks.current, blobPropertyBag);

      cacheMediaBlob(blob);
      setStatus('stopped');
      onStop(blob);
    }
  }, [blobOptions, onStop]);

  const handleError = useCallback(
    (e) => {
      cacheError(e.error);
      setStatus('idle');
      onError(e.error);
    },
    [onError],
  );

  const handleDataAvailable = (e) => {
    if (e.data.size) {
      mediaChunks.current.push(e.data);

      // handleData will be called only after the recording has been stopped.
      // So we will handle rest of operations here.
      handleStop();
    }
  };

  const startRecording = async (/*timeSlice = undefined*/) => {
    if (errorCache) {
      cacheError(null);
    }

    if (!mediaStream.current) {
      await getMediaStream();
    }

    mediaChunks.current = [];

    if (mediaStream.current) {
      mediaRecorder.current = new MediaRecorder(mediaStream.current, mediaRecorderOptions);
      mediaRecorder.current.addEventListener('dataavailable', handleDataAvailable);
      mediaRecorder.current.addEventListener('stop', handleStop);
      mediaRecorder.current.addEventListener('error', handleError);
      mediaRecorder.current.start(); //timeSlice);
      setStatus('recording');
      onStart();
    }
  };

  const muteAudio = useCallback((mute) => {
    cacheIsAudioMuted(mute);

    if (mediaStream.current) {
      mediaStream.current.getAudioTracks().forEach((audioTrack) => {
        audioTrack.enabled = !mute;
      });
    }
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
      mediaRecorder.current.pause();
      setStatus('paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === 'paused') {
      mediaRecorder.current.resume();
      setStatus('recording');
    }
  }, []);

  const stopRecording = () => {
    if (mediaRecorder.current) {
      setStatus('stopping');
      // mediaRecorder.current.requestData();
      mediaRecorder.current.stop();
      mediaRecorder.current.removeEventListener('dataavailable', handleDataAvailable);
      mediaRecorder.current.removeEventListener('stop', handleStop);
      mediaRecorder.current.removeEventListener('error', handleError);
      mediaRecorder.current = null;
      clearMediaStream();
    }
  };

  const clearMediaBlob = useCallback(() => {
    cacheMediaBlob(null);
  }, []);

  useEffect(() => {
    if (!window.MediaRecorder) {
      throw new ReferenceError(
        'MediaRecorder is not supported in this browser. Please ensure that you are running the latest version of chrome/firefox/edge.',
      );
    }

    if (recordScreen && !window.navigator.mediaDevices.getDisplayMedia) {
      throw new ReferenceError('This browser does not support screen capturing.');
    }

    if (isObject(mediaStreamConstraints.video)) {
      validateMediaTrackConstraints(mediaStreamConstraints.video);
    }

    if (isObject(mediaStreamConstraints.audio)) {
      validateMediaTrackConstraints(mediaStreamConstraints.audio);
    }

    if (mediaRecorderOptions && mediaRecorderOptions.mimeType) {
      if (!MediaRecorder.isTypeSupported(mediaRecorderOptions.mimeType)) {
        console.error(
          `The specified MIME type supplied to MediaRecorder is not supported by this browser.`,
        );
      }
    }
  }, [mediaStreamConstraints, mediaRecorderOptions, recordScreen]);

  return {
    error: errorCache,
    status,
    mediaBlob: mediaBlobCache,
    isAudioMuted: isAudioMutedCache,
    liveStream,
    stopRecording,
    getMediaStream,
    startRecording,
    pauseRecording,
    resumeRecording,
    clearMediaStream,
    clearMediaBlob,
    muteAudio: () => muteAudio(true),
    unMuteAudio: () => muteAudio(false),
    // get liveStream() {
    //   if (mediaStream.current) {
    //     return new MediaStream(mediaStream.current.getVideoTracks());
    //   }
    //   return null;
    // }
  };
};

export default useMediaRecorder;
