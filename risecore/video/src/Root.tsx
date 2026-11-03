import {Composition, Folder} from 'remotion';
import {GymVideo, TOTAL} from './GymVideo';
import {Hook} from './scenes/Hook';
import {Overview} from './scenes/Overview';
import {Warmup} from './scenes/Warmup';
import {Bench} from './scenes/Bench';
import {Incline} from './scenes/Incline';
import {Pushup} from './scenes/Pushup';
import {Fly} from './scenes/Fly';
import {Mistake} from './scenes/Mistake';
import {Nutrition} from './scenes/Nutrition';
import {Cta} from './scenes/Cta';
import {calculateLessonMetadata, LessonVideo} from './english/LessonVideo';

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="NgayTapNguc-Scenes">
      <Composition id="Hook" component={Hook} width={1080} height={1920} fps={30} durationInFrames={210} />
      <Composition id="Overview" component={Overview} width={1080} height={1920} fps={30} durationInFrames={180} />
      <Composition id="Warmup" component={Warmup} width={1080} height={1920} fps={30} durationInFrames={240} />
      <Composition id="Bench" component={Bench} width={1080} height={1920} fps={30} durationInFrames={330} />
      <Composition id="Incline" component={Incline} width={1080} height={1920} fps={30} durationInFrames={300} />
      <Composition id="Pushup" component={Pushup} width={1080} height={1920} fps={30} durationInFrames={270} />
      <Composition id="Fly" component={Fly} width={1080} height={1920} fps={30} durationInFrames={300} />
      <Composition id="Mistake" component={Mistake} width={1080} height={1920} fps={30} durationInFrames={270} />
      <Composition id="Nutrition" component={Nutrition} width={1080} height={1920} fps={30} durationInFrames={330} />
      <Composition id="Cta" component={Cta} width={1080} height={1920} fps={30} durationInFrames={210} />
    </Folder>
    <Composition id="NgayTapNguc" component={GymVideo} width={1080} height={1920} fps={30} durationInFrames={TOTAL} />
    <Folder name="TiengAnh">
      {/* durationInFrames thật do calculateLessonMetadata tính từ độ dài giọng đọc */}
      <Composition
        id="TiengAnh-01-HowAreYou"
        component={LessonVideo}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={300}
        defaultProps={{lessonId: '2026-11-04-how-are-you'}}
        calculateMetadata={calculateLessonMetadata}
      />
    </Folder>
  </>
);
