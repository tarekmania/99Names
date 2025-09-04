import { GameResult } from '@/store/game';
import { useToast } from '@/hooks/use-toast';

export function useShare() {
  const { toast } = useToast();

  const shareGameResult = async (result: GameResult) => {
    const score = result.found;
    const total = 99;
    const percentage = Math.round((score / total) * 100);
    const minutes = Math.floor(result.durationMs / 60000);
    const seconds = Math.floor((result.durationMs % 60000) / 1000);
    const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    
    const shareText = `🕌 99 Names Memory - My Result\n\n` +
      `📊 Score: ${score}/99 names (${percentage}%)\n` +
      `⏱️ Time: ${timeString}\n` +
      `${result.completed ? '🎉 Completed all names!' : '💪 Great effort!'}\n\n` +
      `Challenge yourself to memorize the Beautiful Names of Allah!\n` +
      `#99Names #IslamicMemory`;

    const shareData = {
      title: '99 Names Memory - My Result',
      text: shareText,
      url: window.location.origin,
    };

    try {
      // Use Web Share API if available (mobile)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
      
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText + '\n\n' + window.location.origin);
      
      toast({
        title: 'Result Copied!',
        description: 'Your game result has been copied to clipboard. You can now paste it anywhere to share!',
      });
    } catch (error) {
      // Final fallback - show modal with text to copy
      console.warn('Share failed:', error);
      
      toast({
        title: 'Share Your Result',
        description: 'Copy the text below to share your achievement',
      });
    }
  };

  const shareApp = async () => {
    const shareData = {
      title: '99 Names Memory - Islamic Learning Game',
      text: '🕌 Learn and memorize the 99 Beautiful Names of Allah with this engaging memory game! Test your knowledge and track your progress.',
      url: window.location.origin,
    };

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        return;
      }
      
      await navigator.clipboard.writeText(shareData.text + '\n\n' + shareData.url);
      
      toast({
        title: 'Link Copied!',
        description: 'The game link has been copied to clipboard.',
      });
    } catch (error) {
      console.warn('App share failed:', error);
      
      toast({
        title: 'Share 99 Names Memory',
        description: 'Copy the link to share this game with others',
      });
    }
  };

  return {
    shareGameResult,
    shareApp,
  };
}