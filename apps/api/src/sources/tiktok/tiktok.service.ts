import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { VideoAnalysisAgent } from '../../reasoning/agents/video-analysis.agent';
import { SupabaseService } from '../../supabase/supabase.service';
import { SignalsService } from '../../signals/signals.service';

interface TiktokVideo {
  aweme_id: string;
  video_id: string;
  region: string;
  title: string;
  cover: string;
  origin_cover: string;
  duration: number;
  play: string;
  wmplay: string;
  size: number;
  wm_size: number;
  music: string;
  music_info: {
    id: string;
    title: string;
    play: string;
    cover: string;
    author: string;
    original: boolean;
    duration: number;
    album: string;
  };
  play_count: number;
  digg_count: number;
  comment_count: number;
  share_count: number;
  download_count: number;
  create_time: number;
  author: {
    id: string;
    unique_id: string;
    nickname: string;
    avatar: string;
  };
}

@Injectable()
export class TiktokService implements OnModuleInit {
  private readonly logger = new Logger(TiktokService.name);
  private readonly APIFY_TOKEN = 'apify_api_i08bJE9njdgYP9rhTebvTbV62ihg1p3W5kiq';
  private readonly ACTOR_ID = 'oASyAUakdGfJbbMGg';

  constructor(
    private readonly configService: ConfigService,
    private readonly supabase: SupabaseService,
    private readonly signalsService: SignalsService,
    private readonly videoAgent: VideoAnalysisAgent,
  ) { }

  onModuleInit() {
    this.logger.log('TikTok Watcher Service Initialized');
  }

  @Cron(CronExpression.EVERY_12_HOURS)
  async handleCron() {
    this.logger.log('Starting TikTok Disaster Scan...');
    try {
      // 1. Fetch Videos
      const videos = await this.fetchRecentVideos();
      this.logger.log(`Fetched ${videos.length} videos from Apify.`);

      // Process in Parallel
      await Promise.all(videos.map((video) => this.processVideo(video)));
    } catch (error) {
      this.logger.error('Error in TikTok Cron:', error);
    }
  }

  private async fetchRecentVideos(): Promise<TiktokVideo[]> {
    const keywords = ['puting beliung', 'banjir', 'kebakaran', 'tanah longsor'];
    this.logger.log(`Starting parallel fetch for keywords: ${keywords.join(', ')}`);

    const results = await Promise.all(
      keywords.map(async (keyword) => {
        try {
          this.logger.log(`Fetching videos for keyword: ${keyword}`);
          // Start Actor Run
          const input = {
            keywords: keyword,
            publish_time: 1, // Past 24 hours
            region: "ID",
            sort_type: 3, // General
            limit: 20 // Reduced limit per keyword
          };

          const runResponse = await axios.post(
            `https://api.apify.com/v2/acts/${this.ACTOR_ID}/runs?token=${this.APIFY_TOKEN}`,
            input
          );

          const runId = runResponse.data.data.id;
          this.logger.debug(`Apify run started for '${keyword}': ${runId}`);

          // Poll for completion (Simple polling)
          let status = 'RUNNING';
          while (status === 'RUNNING' || status === 'READY') {
            await new Promise((r) => setTimeout(r, 5000));
            const check = await axios.get(
              `https://api.apify.com/v2/acts/${this.ACTOR_ID}/runs/${runId}?token=${this.APIFY_TOKEN}`,
            );
            status = check.data.data.status;
          }

          if (status !== 'SUCCEEDED') {
            this.logger.error(`Apify run failed for '${keyword}' with status ${status}`);
            return [];
          }

          // Fetch Results
          const datasetId = runResponse.data.data.defaultDatasetId;
          const { data: items } = await axios.get(
            `https://api.apify.com/v2/datasets/${datasetId}/items?token=${this.APIFY_TOKEN}`,
          );

          return Array.isArray(items) ? (items as TiktokVideo[]) : [];
        } catch (e) {
          this.logger.error(`Failed to fetch videos from Apify for keyword '${keyword}'`, e);
          return [];
        }
      }),
    );

    const allVideos = results.flat();
    this.logger.log(`Total videos fetched across all keywords: ${allVideos.length}`);
    return allVideos;
  }

  private async processVideo(video: TiktokVideo) {
    // 1. Deduplication (Raw Log)
    // Check if we've ever seen this video before (regardless of whether it became a signal)
    const { data: existing } = await (this.supabase.getClient() as any)
      .from('tiktok_posts')
      .select('id')
      .eq('tiktok_id', video.video_id)
      .maybeSingle();

    if (existing) {
      this.logger.debug(`Video ${video.video_id} already processed (raw log). Skipping.`);
      return;
    }

    // Record usage immediately to prevent re-processing
    await (this.supabase.getClient() as any)
      .from('tiktok_posts')
      .insert({
        tiktok_id: video.video_id,
        author: video.author.nickname,
        text: video.title,
        raw_data: video,
        created_at: new Date().toISOString(),
      });

    // 2. Multimodal Analysis (via Agent)
    const { result: analysis } = await this.videoAgent.run({
      text: video.title,
      author: video.author.nickname,
      likes: video.digg_count,
      videoUrl: video.play, // Using 'play' URL for analysis
      timestamp: video.create_time,
    });

    console.log('analysis', analysis)

    if (!analysis.is_real_event || analysis.confidence_score < 0.6) {
      this.logger.debug(`Video ${video.video_id} rejected: Not real, low confidence, or expired.`);
      return;
    }

    // 3. Create Signal
    const signalPayload = {
      source: 'social_media',
      text: analysis.summary,
      event_type: analysis.event_type,
      lat: null, // As requested
      lng: null, // As requested
      city_hint: analysis.location_inference || null,
      media_url: video.play, // Store the video URL
      media_type: 'video',
      created_at: undefined, // Let DB handle it
      happened_at: analysis?.happened_at || new Date(video.create_time * 1000).toISOString(),
      raw_payload: {
        tiktok_video_id: video.video_id,
        author: video.author.nickname,
        reason: analysis.reason,
        descriptor: analysis,
      }
    };
    console.log('signalPayload', signalPayload)

    this.logger.log(`Ingesting Signal for video ${video.video_id}: ${signalPayload.text}`);
    const signal = await this.signalsService.createSignal(signalPayload);

    // 4. Update tiktok_posts with signal_id if created
    if (signal && signal.id) {
      await (this.supabase.getClient() as any)
        .from('tiktok_posts')
        .update({ signal_id: signal.id })
        .eq('tiktok_id', video.video_id);
    }
  }
}
