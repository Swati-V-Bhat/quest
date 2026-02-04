import React from 'react'

const HowItWorks = () => {
  return (
    <>
      <div id='how-it-works' className='bg-[#FFFFFF]/10 py-20 pb-24 px-4'>
        <div className='text-5xl pb-10 text-center font-arsenal italic'>
          How it <span className='text-[#EA6100] font-[700 ]'>works ?</span>
        </div>
        <div className='flex flex-col md:flex-row justify-center items-center gap-6'>
          <div className='flex flex-col shadow-xl bg-[#F86F0A]/10 rounded-xl gap-3 md:w-[27vw]'>
            <img className='p-4 w-20' src="/circus.png" alt="" />
            <div className='pl-4 text-xl font-[650]'>1. Set Your Destination</div>
            <div className='pl-4 pb-4'>Tell OnQuest where you’re headed and what kind of vibe you’re chasing. </div>
          </div>
          <div className='flex flex-col shadow-xl bg-[#F86F0A]/10 rounded-xl gap-3 md:w-[27vw]'>
            <img className='p-4 w-20' src="/pebble.png" alt="" />
            <div className='pl-4 text-xl font-[650]'>Create & Share Your Quest</div>
            <div className='pl-4 pb-4'>Turn your itinerary into a post — share, build, and get ideas</div>
          </div>
          <div className='flex flex-col shadow-xl bg-[#F86F0A]/10 rounded-xl gap-3 md:w-[27vw]'>
            <img className='p-4 w-20' src="/suitcase.png" alt="" />
            <div className='pl-4 text-xl font-[650]'>3. Finish Quests and Flaunt Badges</div>
            <div className='pl-4 pb-4'>Travel’s more fun when there’s a score to beat.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default HowItWorks
