import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupabaseService } from '../../supabase/supabase.service';
import axios from 'axios';

import { SignalsService } from '../../signals/signals.service';
import { MAX_SIGNAL_AGE } from '../../common/constants';

@Injectable()
export class BmkgService {
  private readonly logger = new Logger(BmkgService.name);
  private readonly URLS = {
    monitor: 'https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json', // < 5 Felt
    alert: 'https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json', // >= 5
  };

  private get db() {
    return this.supabase.getClient();
  }

  constructor(
    private readonly supabase: SupabaseService,
    private readonly signalsService: SignalsService
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async fetchQuakes() {
    this.logger.log('Fetching earthquake data from BMKG...');
    
    try {
      const  [monitorRes, alertRes] = await Promise.all([
        axios.get(this.URLS.monitor),
        axios.get(this.URLS.alert)
      ]);

      const monitorQuakes = this.parseQuakes(monitorRes.data).map(q => ({ ...q, _category: 'monitor' }));
      const alertQuakes = this.parseQuakes(alertRes.data).map(q => ({ ...q, _category: 'alert' }));
      
      const allQuakes = [...alertQuakes, ...monitorQuakes]; // Process alerts first
      this.logger.log(`Fetched ${allQuakes.length} quakes from BMKG. Processing...`);

      for (const quake of allQuakes) {
        await this.processQuake(quake, quake._category);
      }

    } catch (error) {
      this.logger.error('Failed to fetch/process BMKG data', error);
    }
  }

  private parseQuakes(data: any): any[] {
    // BMKG data structure: { Infogempa: { gempa: [ ... ] or { ... } } }
    // Sometimes 'gempa' is array, sometimes object if single result
    const info = data?.Infogempa?.gempa;
    if (!info) return [];
    return Array.isArray(info) ? info : [info];
  }

  private async processQuake(quake: any, category: 'monitor' | 'alert') {
    // 1. Generate ID (use DateTime + Coordinates as unique key)
    // DateTime format: "2024-01-14 10:00:00" or similar
    const bmkgId = `${quake.DateTime}_${quake.Coordinates}`;

    // 2. Map coordinates
    const [latStr, lngStr] = quake.Coordinates.split(',');
    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    // 3. Create Text Summary
    const categoryTag = category === 'alert' ? '[ALERT - POTENTIAL DISASTER]' : '[MONITOR - FELT Report]';
    const text = `Status: ${categoryTag}, Gempa Mag:${quake.Magnitude}, ${quake.DateTime}, Lok: ${quake.Wilayah} (${quake.Kedalaman})`;

    // 4. Check Deduplication via raw_payload search or ID pattern in signals? 
    // We'll query signals where source='bmkg' and created roughly same time? 
    // Better: Store the BmkgID in raw_payload -> bmkg_id and query that.
    
    const { data: existing } = await this.db.from('signals')
      .select('id')
      .eq('source', 'bmkg')
      .contains('raw_payload', { bmkg_id: bmkgId }) // JSONB containment
      .maybeSingle();

    if (existing) {
      this.logger.debug(`Skipping existing quake: ${bmkgId}`);
      return;
    }

    // 4.1 Check Signal Age
    const happenedAt = this.parseDate(quake.DateTime);
    const eventTime = new Date(happenedAt).getTime();
    const now = Date.now();
    const ageHours = (now - eventTime) / (1000 * 60 * 60);

    if (ageHours > MAX_SIGNAL_AGE.earthquake) {
      this.logger.debug(`Skipping old quake: ${bmkgId} (Age: ${ageHours.toFixed(1)}h > ${MAX_SIGNAL_AGE.earthquake}h)`);
      return;
    }

    // 5. Ingest via SignalsService
    try {
      await this.signalsService.createSignal({
        source: 'bmkg',
        text,
        lat,
        lng,
        city_hint: quake.Wilayah,
        happened_at: happenedAt,
        raw_payload: {
          ...quake,
          bmkg_id: bmkgId,
        }
      });
      this.logger.log(`Ingested new quake: ${text}`);
    } catch (error) {
      this.logger.error(`Failed to ingest quake ${bmkgId}`, error);
    }
  }

  private parseDate(dateStr: string): string {
    // If ISO 8601 with timezone (contains Z or +), trust it
    if (dateStr.includes('Z') || dateStr.match(/[+-]\d{2}:\d{2}$/)) {
      return new Date(dateStr).toISOString();
    }

    // Assume UTC+7 (WIB) for "YYYY-MM-DD HH:mm:ss"
    // Replace space with T and append +07:00
    const isoLike = dateStr.replace(' ', 'T');
    return new Date(`${isoLike}+07:00`).toISOString();
  }
}
