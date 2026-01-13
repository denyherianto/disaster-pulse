export type Language = 'en' | 'id';

export const translations = {
  en: {
    common: {
      loading: 'Loading...',
      error: 'An error occurred',
      retry: 'Retry',
      back: 'Back',
      save: 'Save',
      cancel: 'Cancel',
      submit: 'Submit',
      disasterTypes: {
        all: 'All',
        flood: 'Flood',
        earthquake: 'Earthquake',
        fire: 'Fire',
        landslide: 'Landslide',
        power_outage: 'Power Outage',
        other: 'Other'
      }
    },
    dashboard: {
      title: 'Disaster Pulse',
      status: {
        online: 'Online',
        offline: 'Offline Mode',
        syncing: 'Syncing data...',
        cached: 'Showing cached data from',
        uptodate: 'Up to date'
      },
      liveRadius: {
        title: 'Live Radius',
        expand: 'Expand Map'
      },
      recentAlerts: 'Recent Alerts',
      reportIncident: 'Report Incident'
    },
    incidentFeed: {
        empty: 'No recent alerts nearby.',
        viewAll: 'View all',
        alert: 'Alert',
        unknownLocation: 'Unknown location',
        confidence: {
            high: 'High',
            medium: 'Medium',
            low: 'Low'
        }
    },
    report: {
      title: 'Report Incident',
      selectType: 'Select Type',
      description: 'Description',
      descriptionPlaceholder: 'Describe what you see...',
      location: {
        detecting: 'Detecting location...',
        detected: 'Location detected',
        unavailable: 'Unable to retrieve location',
        denied: 'Location permission denied',
        timeout: 'Location request timed out',
        required: 'Location is required to submit a report.'
      },
      submit: 'Submit Report',
      submitting: 'Submitting...',
      success: 'Report submitted successfully! Thank you for your help.'
    },
    settings: {
      title: 'Settings',
      language: 'Language',
      selectLanguage: 'Select Language'
    },
    navigation: {
      home: 'Home',
      alerts: 'Alerts',
      map: 'Map',
      guides: 'Guides',
      profile: 'Profile'
    },
    map: {
      filter: {
        location: 'Location',
        allIndonesia: 'All Indonesia'
      }
    },
    alerts: {
      title: 'All Alerts',
      filter: {
        location: 'Location',
        type: 'Disaster Type',
        allLocations: 'All Locations',
        allTypes: 'All Types'
      },
      empty: 'No alerts found with current filters.',
      endOfList: 'End of list',
      loading: 'Loading alerts...'
    },
    guides: {
      title: 'Safety Guides',
      empty: 'No guides found for this category.',
      loading: 'Loading guides...'
    },
    profile: {
      title: 'Profile',
      memberSince: 'Member since',
      contributions: 'Your Contributions',
      reports: 'Reports',
      confirmed: 'Confirmed',
      hoax: 'Hoax',
      myPlaces: 'My Places',
      myPlacesDesc: 'Manage saved locations',
      notifications: 'Notifications',
      notificationsDesc: 'Alert preferences',

      privacyPolicy: 'Privacy Policy',
      privacyPolicyDesc: 'Data sources & user rights',
      settingsDesc: 'App preferences',
      signOut: 'Sign Out'
    },
    incidentDetail: {
      notFound: 'Incident not found',
      confidence: 'Confidence',
      severity: 'Severity',
      reports: 'Reports',
      timeline: 'Incident Timeline',
      firstDetected: 'First Detected',
      currentStatus: 'Current Status',
      verification: {
        title: 'Is this real?',
        subtitle: 'Help us verify this incident by sharing your knowledge',
        confirm: 'Confirm',
        confirmed: 'Confirmed',
        falseAlarm: 'False Alarm',
        reportedFalse: 'Reported as False',
        communityStats: 'Community Verification'
      },
      sources: {
        userReports: 'User Reports',
        verifiedReports: 'verified reports',
        news: 'Latest News',
        readMore: 'Read more',
        liveUpdates: 'Live Updates'
      },
      safety: {
        title: 'Safety Measures',
        viewGuide: 'View Safety Guide',
        procedures: 'Procedures for'
      },
      emergency: {
        title: 'Emergency Contacts',
        call: 'Call'
      }
    }
  },
  id: {
    common: {
      loading: 'Memuat...',
      error: 'Terjadi kesalahan',
      retry: 'Coba Lagi',
      back: 'Kembali',
      save: 'Simpan',
      cancel: 'Batal',
      submit: 'Kirim',
      disasterTypes: {
        all: 'Semua',
        flood: 'Banjir',
        earthquake: 'Gempa Bumi',
        fire: 'Kebakaran',
        landslide: 'Tanah Longsor',
        power_outage: 'Mati Listrik',
        other: 'Lainnya'
      }
    },
    dashboard: {
      title: 'Disaster Pulse',
      status: {
        online: 'Online',
        offline: 'Mode Offline',
        syncing: 'Menyinkronkan data...',
        cached: 'Menampilkan data cache dari',
        uptodate: 'Terbaru'
      },
      liveRadius: {
        title: 'Radius Langsung',
        expand: 'Buka Peta'
      },
      recentAlerts: 'Peringatan Terkini',
      reportIncident: 'Lapor Kejadian'
    },
    incidentFeed: {
        empty: 'Tidak ada peringatan terkini di sekitar.',
        viewAll: 'Lihat semua',
        alert: 'Peringatan',
        unknownLocation: 'Lokasi tidak diketahui',
        confidence: {
            high: 'Tinggi',
            medium: 'Sedang',
            low: 'Rendah'
        }
    },
    report: {
      title: 'Lapor Kejadian',
      selectType: 'Pilih Jenis',
      description: 'Deskripsi',
      descriptionPlaceholder: 'Jelaskan apa yang Anda lihat...',
      location: {
        detecting: 'Mendeteksi lokasi...',
        detected: 'Lokasi terdeteksi',
        unavailable: 'Tidak dapat mengambil lokasi',
        denied: 'Izin lokasi ditolak',
        timeout: 'Waktu permintaan lokasi habis',
        required: 'Lokasi diperlukan untuk mengirim laporan.'
      },
      submit: 'Kirim Laporan',
      submitting: 'Mengirim...',
      success: 'Laporan berhasil dikirim! Terima kasih atas bantuan Anda.'
    },
    settings: {
      title: 'Pengaturan',
      language: 'Bahasa',
      selectLanguage: 'Pilih Bahasa'
    },
    navigation: {
      home: 'Beranda',
      alerts: 'Peringatan',
      map: 'Peta',
      guides: 'Panduan',
      profile: 'Profil'
    },
    map: {
      filter: {
        location: 'Lokasi',
        allIndonesia: 'Semua Indonesia'
      }
    },
    alerts: {
      title: 'Semua Peringatan',
      filter: {
        location: 'Lokasi',
        type: 'Jenis Bencana',
        allLocations: 'Semua Lokasi',
        allTypes: 'Semua Jenis'
      },
      empty: 'Tidak ada peringatan ditemukan dengan filter saat ini.',
      endOfList: 'Akhir daftar',
      loading: 'Memuat peringatan...'
    },
    guides: {
      title: 'Panduan Keselamatan',
      empty: 'Tidak ada panduan ditemukan untuk kategori ini.',
      loading: 'Memuat panduan...'
    },
    profile: {
      title: 'Profil',
      memberSince: 'Anggota sejak',
      contributions: 'Kontribusi Anda',
      reports: 'Laporan',
      confirmed: 'Terkonfirmasi',
      hoax: 'Hoax',
      myPlaces: 'Tempat Saya',
      myPlacesDesc: 'Kelola lokasi tersimpan',
      notifications: 'Notifikasi',
      notificationsDesc: 'Preferensi peringatan',

      privacyPolicy: 'Kebijakan Privasi',
      privacyPolicyDesc: 'Sumber data & hak pengguna',
      settingsDesc: 'Preferensi aplikasi',
      signOut: 'Keluar'
    },
    incidentDetail: {
      notFound: 'Insiden tidak ditemukan',
      confidence: 'Keyakinan',
      severity: 'Tingkat Keparahan',
      reports: 'Laporan',
      timeline: 'Linimasa Kejadian',
      firstDetected: 'Pertama Terdeteksi',
      currentStatus: 'Status Saat Ini',
      verification: {
        title: 'Apakah ini nyata?',
        subtitle: 'Bantu kami memverifikasi kejadian ini',
        confirm: 'Konfirmasi',
        confirmed: 'Terkonfirmasi',
        falseAlarm: 'Alarm Palsu',
        reportedFalse: 'Dilaporkan Palsu',
        communityStats: 'Verifikasi Komunitas'
      },
      sources: {
        userReports: 'Laporan Pengguna',
        verifiedReports: 'laporan terverifikasi',
        news: 'Berita Terkini',
        readMore: 'Baca selengkapnya',
        liveUpdates: 'Update Langsung'
      },
      safety: {
        title: 'Tindakan Pengamanan',
        viewGuide: 'Lihat Panduan',
        procedures: 'Prosedur untuk'
      },
      emergency: {
        title: 'Kontak Darurat',
        call: 'Panggil'
      }
    }
  }
};
