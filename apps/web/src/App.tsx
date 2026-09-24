import { useEffect } from 'react';
import { AppProvider, useApp } from './lib/store';
import { navigate, useRoute } from './lib/router';
import { ReviewPage } from './pages/ReviewPage';
import { LoginPage } from './pages/LoginPage';
import { ChildPicker } from './pages/ChildPicker';
import { ChildHome } from './pages/ChildHome';
import { KnowledgeMap } from './pages/KnowledgeMap';
import { KpPage } from './pages/KpPage';
import { LessonPage } from './pages/LessonPage';
import { PracticePage } from './pages/PracticePage';
import { MistakesPage } from './pages/MistakesPage';
import { ParentPage } from './pages/ParentPage';
import { EyeBreak } from './components/EyeBreak';
import { UpdateBanner } from './components/UpdateBanner';

function ChildRoutes({ childId, parts, query }: { childId: string; parts: string[]; query: URLSearchParams }) {
  const { child, loadChild, family } = useApp();
  const profile = child(childId);
  useEffect(() => {
    loadChild(childId);
  }, [childId, loadChild]);
  useEffect(() => {
    if (family.version >= 0 && family.children.length > 0 && !profile) navigate('/', true);
  }, [profile, family]);
  if (!profile) return null;

  const [section, arg] = parts;
  const back = query.get('back') ?? `/c/${childId}`;
  let page;
  switch (section) {
    case 'map':
      page = <KnowledgeMap child={profile} />;
      break;
    case 'kp':
      page = <KpPage child={profile} kpId={arg} />;
      break;
    case 'lesson':
      return <LessonPage childId={childId} lessonId={arg} back={back} />;
    case 'practice':
      page = <PracticePage child={profile} mode={arg} query={query} back={back} />;
      break;
    case 'mistakes':
      page = <MistakesPage child={profile} />;
      break;
    default:
      page = <ChildHome child={profile} />;
  }
  return (
    <>
      {page}
      <EyeBreak childId={childId} />
    </>
  );
}

function Routes() {
  const { parts, query } = useRoute();
  const { auth } = useApp();

  if (auth === 'loading') return <div className="flex h-full items-center justify-center text-slate-400">加载中…</div>;
  if (auth === 'need-login') return <LoginPage />;

  switch (parts[0]) {
    case 'c':
      return <ChildRoutes childId={parts[1]} parts={parts.slice(2)} query={query} />;
    case 'parent':
      return <ParentPage tab={parts[1]} />;
    default:
      return <ChildPicker />;
  }
}

export function App() {
  const { parts } = useRoute();
  // The review page is served by `pnpm content review` and needs no login or data.
  if (parts[0] === 'review') return <ReviewPage />;
  return (
    <AppProvider>
      <UpdateBanner />
      <Routes />
    </AppProvider>
  );
}
