import { BehaviorSubject } from 'rxjs';

export interface TimerTick {
  hours: number;
  minutes: number;
  seconds: number;
}
type MaxRecordingTimeReachedListener = () => void;

export type TimerStatus = 'active' | 'paused' | 'off';

export class CountdownTimer {
  private $currentTimeSubject = new BehaviorSubject<TimerTick | null>(null);

  private $startTime?: number;
  private $pauseTime = 0;
  private $pauseStartTime?: number = 0;

  private $status: TimerStatus = 'off';
  private $statusSubject = new BehaviorSubject<TimerStatus>('off');

  private $listeners: MaxRecordingTimeReachedListener[] = [];
  private $intervalId?: ReturnType<typeof setInterval>;
  /**
   *
   * @param maximumRecordingTime {number} The maximum recording time in minutes.
   */
  constructor(private maximumRecordingTime: number) {}

  /**
   * Subject to listen on timer status changes.
   */
  public get status() {
    return this.$statusSubject;
  }

  /**
   * Subject to listen on the timer tick.
   */
  public get currentTime(): BehaviorSubject<TimerTick | null> {
    return this.$currentTimeSubject;
  }

  /**
   * Start timer from this moment.
   */
  public start = () => {
    if (this.$status === 'active') {
      return;
    }
    this.$startTime = new Date().getTime();
    this.$pauseTime = 0;

    this.startTimer();
    this.tick();
  };

  /**
   * Resume timer when paused.
   */
  public resume = () => {
    if (this.$status !== 'paused') {
      return;
    }
    if (!this.$pauseStartTime) {
      throw new Error('Internal error. Pause start time not set.');
    }
    const delta = new Date().getTime() - this.$pauseStartTime;

    this.$pauseTime += delta;
    this.startTimer();
  };

  /**
   * Pause timer when active
   */
  public pause = () => {
    if (this.$status !== 'active') {
      return;
    }
    clearInterval(this.$intervalId);
    this.$pauseStartTime = new Date().getTime();
    this.setStatus('paused');
  };

  /**
   * Stop timer
   */
  public stop = () => {
    clearInterval(this.$intervalId);
    this.setStatus('off');
  };

  /**
   * Add a listener.
   *
   * @param listener {MaxRecordingTimeReachedListener} Listener to be trigged when max recording time has been reached.
   */
  public addMaxRecordingTimeReachedListener = (listener: MaxRecordingTimeReachedListener) => {
    if (!this.$listeners.includes(listener)) {
      this.$listeners.push(listener);
    }
  };

  /**
   * Remove a registered listener.
   *
   * @param listener {MaxRecordingTimeReachedListener} Listener to be trigged when max recording time has been reached.
   */
  public removeMaxRecordingTimeReachedListener = (listener: MaxRecordingTimeReachedListener) => {
    const index = this.$listeners.indexOf(listener);
    if (index >= 0) {
      this.$listeners.splice(index, 1);
    }
  };

  private startTimer = () => {
    this.$intervalId = setInterval(this.tick, 1000);
    this.setStatus('active');
  };

  private triggerMaxRecordingTimeReachedListeners = () => {
    this.$listeners.forEach((listener) => {
      try {
        listener();
      } catch (error) {
        console.error(error);
      }
    });
  };

  /**
   * Tick time when timer is active
   */
  private tick = () => {
    if (!this.$startTime) {
      throw new Error('Internal error: no start time defined.');
    }
    const delta = new Date().getTime() - this.$startTime;

    const maximumTimeInMilliseconds = this.maximumRecordingTime * 60 * 1000;
    const timeLeft = maximumTimeInMilliseconds + this.$pauseTime - delta;

    if (timeLeft <= 0) {
      this.setStatus('off');
      this.$currentTimeSubject.next(null);
      this.triggerMaxRecordingTimeReachedListeners();
      return;
    }

    const seconds = Math.floor((timeLeft / 1000) % 60);
    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
    const hours = Math.floor(timeLeft / 1000 / 60 / 60);

    this.$currentTimeSubject.next({
      hours,
      minutes,
      seconds,
    });
  };

  private setStatus = (status: TimerStatus) => {
    if (status !== this.$status) {
      this.$status = status;
      this.$statusSubject.next(status);
    }
  };
}
