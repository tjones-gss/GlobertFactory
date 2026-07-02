/* ===========================================================
   chapters.js — Globert career progression (shared by the
   factory game and the homepage). Pure data, no DOM.

   Each chapter is a "promotion" on the shop floor. Goals read
   live metrics off the running sim/ERP:
     shipped     -> SIM.S.shipped         (lifetime widgets shipped)
     ordersDone  -> ERP.completed         (work orders fulfilled)
     maxActive   -> ERP.maxActive         (peak simultaneous machines)
     tpm         -> SIM.throughput()      (widgets / min, rolling 60s)
     onTime      -> on-time delivery %     (needs >=goalOrders shipped)
   =========================================================== */
window.CHAPTERS = [
  {
    id: 'ch1', n: 1, name: 'First Light', rank: 'Shop-Floor Trainee',
    blurb: 'Stand up the line. Mine ore, smelt plate, assemble a Widget, and get it out the door.',
    reward: 600,
    goals: [
      { label: 'Ship your first 5 Widgets', metric: 'shipped', goal: 5 }
    ]
  },
  {
    id: 'ch2', n: 2, name: 'Steady Hands', rank: 'Line Lead',
    blurb: 'A real shop runs on work orders. Keep the floor fed and clear the queue before the clock runs out.',
    reward: 1200,
    goals: [
      { label: 'Ship 30 Widgets', metric: 'shipped', goal: 30 },
      { label: 'Fulfill 3 work orders', metric: 'ordersDone', goal: 3 }
    ]
  },
  {
    id: 'ch3', n: 3, name: 'Scaling Up', rank: 'Shift Supervisor',
    blurb: 'Quote to cash means throughput. Branch your conveyors and bring more machines online at once.',
    reward: 2400,
    goals: [
      { label: 'Run 6 machines at the same time', metric: 'maxActive', goal: 6 },
      { label: 'Reach 8 Widgets / min', metric: 'tpm', goal: 8 }
    ]
  },
  {
    id: 'ch4', n: 4, name: 'On Time, Every Time', rank: 'Production Manager',
    blurb: 'A quality part, on time, every time. Hit your delivery dates and keep the customers happy.',
    reward: 4000,
    goals: [
      { label: 'Fulfill 8 work orders', metric: 'ordersDone', goal: 8 },
      { label: 'Hold on-time delivery at 85%+', metric: 'onTime', goal: 85 }
    ]
  },
  {
    id: 'ch5', n: 5, name: 'The Mega Line', rank: 'Plant Manager',
    blurb: 'Run the whole floor like a Woodlands veteran. Maximum machines, maximum flow, maximum mubarak.',
    reward: 8000,
    goals: [
      { label: 'Ship 200 Widgets', metric: 'shipped', goal: 200 },
      { label: 'Sustain 15 Widgets / min', metric: 'tpm', goal: 15 }
    ]
  },
  {
    id: 'ch6', n: 6, name: 'Rush Desk', rank: 'Customer Success Commander',
    blurb: 'Live-fire orders hit the dock. Win skirmishes and prove the floor can answer pressure.',
    reward: 10000,
    goals: [
      { label: 'Win 3 Shift Skirmishes', metric: 'skirmishWins', goal: 3 },
      { label: 'Hold a 2-skirmish streak', metric: 'skirmishStreak', goal: 2 }
    ]
  },
  {
    id: 'ch7', n: 7, name: 'Flow State', rank: 'Director of Throughput',
    blurb: 'The factory is no longer a line. It is a living system: fast, lean, and hard to knock off balance.',
    reward: 14000,
    goals: [
      { label: 'Ship 400 Widgets', metric: 'shipped', goal: 400 },
      { label: 'Sustain 22 Widgets / min', metric: 'tpm', goal: 22 }
    ]
  },
  {
    id: 'ch8', n: 8, name: 'Wild Release', rank: 'VP of Operations',
    blurb: 'A public-ready plant needs consistency. Win, ship, and keep customers happy over a long run.',
    reward: 20000,
    goals: [
      { label: 'Win 8 Shift Skirmishes', metric: 'skirmishWins', goal: 8 },
      { label: 'Fulfill 20 work orders', metric: 'ordersDone', goal: 20 },
      { label: 'Hold on-time delivery at 90%+', metric: 'onTime', goal: 90 }
    ]
  }
];

/* rank you earn AFTER finishing the whole career */
window.CAREER_TOP = 'VP of Operations';
