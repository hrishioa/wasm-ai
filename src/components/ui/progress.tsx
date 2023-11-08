import React, { useEffect } from 'react';
import * as Progress from '@radix-ui/react-progress';

const ProgressBar = ({progress}: {progress: number}) => {
  useEffect(() => {
    console.log('Progress is ',progress)
  }, [progress])

  return (
    <Progress.Root
      className="relative mx-1 overflow-hidden bg-background rounded-full h-[25px]"
      style={{
        transform: 'translateZ(0)',
      }}
      value={progress}
    >
      <Progress.Indicator
        className="bg-white w-full h-full transition-transform duration-[660ms] ease-[cubic-bezier(0.65, 0, 0.35, 1)]"
        style={{ transform: `translateX(-${100 - progress}%)` }}
      />
    </Progress.Root>
  );
};

export default ProgressBar;