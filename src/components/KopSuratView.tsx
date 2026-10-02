import React from 'react';
import { SchoolInfo } from '../types';

interface KopSuratViewProps {
  schoolInfo?: SchoolInfo;
  customTitle?: string;
  customSubtitle?: string;
  className?: string;
  compact?: boolean;
}

export const KopSuratView: React.FC<KopSuratViewProps> = ({
  schoolInfo,
  customTitle,
  customSubtitle,
  className = '',
  compact = false,
}) => {
  const kop = schoolInfo?.kopSekolah;

  // Font family resolution
  const fontFamily = kop?.fontFamily || 'Times New Roman, Times, Georgia, serif';

  // Font sizes resolution (with defaults)
  const sizeYayasan = kop?.fontSizeYayasan || (compact ? 11 : 12);
  const sizeInstansi = kop?.fontSizeInstansi || (compact ? 15 : 18);
  const sizeSubJudul = kop?.fontSizeSubJudul || (compact ? 9.5 : 11);
  const sizeTeleponEmail = kop?.fontSizeTeleponEmail || (compact ? 8.5 : 9.5);
  const logoSize = kop?.logoSize || (compact ? 52 : 68);

  const yayasanText = kop?.yayasan || 'YAYASAN PENDIDIKAN BAKTI PUTRA MANDIRI';
  const instansiText = kop?.instansi || schoolInfo?.namaLengkap || schoolInfo?.nama || 'SMK BAKTI PUTRA MANDIRI';
  const subJudulText = kop?.subJudul || 'Kompetensi Keahlian: Farmasi Klinis • Asisten Keperawatan • Tata Kecantikan & Spa • Perhotelan';
  const teleponEmailText = kop?.teleponEmail || `${schoolInfo?.alamatLengkap || schoolInfo?.alamat || 'Parung Panjang, Bogor'} | Telp: ${schoolInfo?.telepon || '(021) 5978-2345'}`;
  const logoUrl = schoolInfo?.logoUrl || '/logo_bpm.png';

  const isGarisGanda = kop?.garisGanda ?? true;
  const lineThickness = kop?.lineThickness || 'sedang';

  return (
    <div 
      className={`w-full text-black select-text ${className}`}
      style={{ fontFamily }}
    >
      <div className="flex items-center justify-between gap-4 pb-2">
        {/* Left Official School Logo */}
        <div 
          className="shrink-0 flex items-center justify-center"
          style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
        >
          <img
            src={logoUrl}
            alt="Logo Sekolah"
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/logo_bpm.png';
            }}
          />
        </div>

        {/* Center School Identity Header */}
        <div className="flex-1 text-center px-1">
          <p 
            className="font-bold tracking-wider uppercase leading-tight text-slate-900"
            style={{ fontSize: `${sizeYayasan}px` }}
          >
            {yayasanText}
          </p>

          <h1 
            className="font-black tracking-normal uppercase leading-snug text-slate-950 mt-0.5"
            style={{ fontSize: `${sizeInstansi}px` }}
          >
            {instansiText}
          </h1>

          <p 
            className="font-medium text-slate-800 leading-tight mt-0.5"
            style={{ fontSize: `${sizeSubJudul}px` }}
          >
            {subJudulText}
          </p>

          <p 
            className="text-slate-600 leading-tight mt-0.5"
            style={{ fontSize: `${sizeTeleponEmail}px` }}
          >
            {teleponEmailText}
          </p>
        </div>

        {/* Right spacing anchor (or duplicate right logo if desired) */}
        <div 
          className="shrink-0 invisible"
          style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
          aria-hidden="true"
        />
      </div>

      {/* Official Separator Line (Garis Pembatas KOP Kedinasan) */}
      {isGarisGanda ? (
        <div className="w-full mt-1 mb-3">
          <div 
            className={`border-b-black ${
              lineThickness === 'tebal' 
                ? 'border-b-[3.5px]' 
                : lineThickness === 'tipis' 
                ? 'border-b-[1.5px]' 
                : 'border-b-[2.5px]'
            }`} 
          />
          <div className="border-b border-b-black mt-[1.5px]" />
        </div>
      ) : (
        <div 
          className={`w-full mt-1 mb-3 border-b-black ${
            lineThickness === 'tebal' ? 'border-b-[3px]' : 'border-b-[1.5px]'
          }`} 
        />
      )}

      {/* Optional Document Title & Subtitle */}
      {customTitle && (
        <div className="text-center my-3">
          <h2 className="text-base sm:text-lg font-black uppercase underline underline-offset-4 tracking-wider text-slate-900">
            {customTitle}
          </h2>
          {customSubtitle && (
            <p className="text-xs text-slate-600 mt-1 font-medium">
              {customSubtitle}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
