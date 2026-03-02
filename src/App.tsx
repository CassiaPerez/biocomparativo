<div className="mt-16 md:mt-24">
  <div className="flex items-center gap-4 md:gap-6 mb-10 md:mb-12">
    <div className="h-px flex-1 bg-gcf-black/10"></div>
    <div className="flex items-center gap-3 px-4 md:px-6 py-2 bg-white border border-gcf-black/10 rounded-[14px] shadow-sm">
      <ArrowRightLeft className="text-gcf-green" size={20} />
      <h3 className="text-base md:text-lg font-bold text-gcf-black uppercase tracking-tighter">
        Análise de Diferenças
      </h3>
    </div>
    <div className="h-px flex-1 bg-gcf-black/10"></div>
  </div>

  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
    {/* ✅ 1) Diferença Custo / ha (percentual) */}
    <div className="bg-gcf-green p-8 sm:p-10 rounded-[28px] shadow-2xl shadow-gcf-green/20 flex flex-col items-center text-center relative overflow-hidden group">
      <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-white/10 rounded-full blur-3xl transition-all group-hover:scale-150"></div>
      <span className="text-[10px] font-bold text-gcf-offwhite/60 uppercase tracking-[0.2em] mb-4 relative z-10">
        Diferença Custo / ha
      </span>

      {(() => {
        const cropCusto = cropCalculated['Custo_R$_por_ha'];
        const compCusto = compCalculated['Custo_R$_por_ha'];

        if (cropCusto.isZero()) {
          return <div className="text-2xl font-bold font-mono mb-2 text-gcf-offwhite/40 relative z-10">-</div>;
        }

        const diffPercent = compCusto.minus(cropCusto).dividedBy(cropCusto).times(100);
        const isMoreExpensive = diffPercent.gt(0);
        const isEqual = diffPercent.isZero();

        return (
          <>
            <div className="text-4xl sm:text-5xl md:text-6xl font-bold font-mono mb-6 relative z-10 text-gcf-offwhite tracking-tighter">
              {isEqual ? '0%' : `${isMoreExpensive ? '+' : ''}${diffPercent.toFixed(0)}%`}
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold text-gcf-offwhite relative z-10 border border-white/10 uppercase tracking-widest">
              {isEqual ? (
                <span>Mesmo custo</span>
              ) : isMoreExpensive ? (
                <>
                  <TrendingUp size={14} className="text-gcf-offwhite/60" />
                  <span>Concorrente mais caro</span>
                </>
              ) : (
                <>
                  <TrendingDown size={14} className="text-gcf-offwhite" />
                  <span>Concorrente mais barato</span>
                </>
              )}
            </div>
          </>
        );
      })()}
    </div>

    {/* ✅ 2) Diferença UFC / ha (percentual) */}
    <div className="bg-white p-8 sm:p-10 rounded-[28px] border border-gcf-black/10 shadow-xl shadow-gcf-black/5 flex flex-col items-center text-center group">
      <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em] mb-4">
        Diferença UFC / ha
      </span>

      {(() => {
        const cropUfc = cropCalculated.UFC_ou_conidios_ha;
        const compUfc = compCalculated.UFC_ou_conidios_ha;

        if (cropUfc.isZero()) {
          return <div className="text-2xl font-bold font-mono mb-2 text-gcf-black/20">-</div>;
        }

        const diffPercent = compUfc.minus(cropUfc).dividedBy(cropUfc).times(100);
        const isSuperior = diffPercent.gt(0);
        const isEqual = diffPercent.isZero();

        return (
          <>
            <div
              className={`text-4xl sm:text-5xl md:text-6xl font-bold font-mono mb-6 tracking-tighter ${
                isEqual ? 'text-gcf-black' : isSuperior ? 'text-gcf-green' : 'text-gcf-black/60'
              }`}
            >
              {isEqual ? '0%' : `${isSuperior ? '+' : ''}${diffPercent.toFixed(0)}%`}
            </div>

            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-bold border uppercase tracking-widest ${
                isEqual
                  ? 'bg-gcf-black/5 text-gcf-black/40 border-gcf-black/10'
                  : isSuperior
                    ? 'bg-gcf-green/10 text-gcf-green border-gcf-green/20'
                    : 'bg-gcf-black/5 text-gcf-black/60 border-gcf-black/10'
              }`}
            >
              {isEqual ? (
                <span>Mesma concentração</span>
              ) : isSuperior ? (
                <>
                  <TrendingUp size={14} />
                  <span>Concorrente superior</span>
                </>
              ) : (
                <>
                  <TrendingDown size={14} />
                  <span>Concorrente inferior</span>
                </>
              )}
            </div>
          </>
        );
      })()}
    </div>

    {/* ✅ 3) Diferença UFC / mm² (ABSOLUTO, sem %) */}
    <div className="bg-white p-8 sm:p-10 rounded-[28px] border border-gcf-black/10 shadow-xl shadow-gcf-black/5 flex flex-col items-center text-center group">
      <span className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-[0.2em] mb-4">
        Diferença UFC / mm²
      </span>

      {(() => {
        const cropUfcMm2 = cropCalculated.UFC_ou_conidios_mm2_superficie;
        const compUfcMm2 = compCalculated.UFC_ou_conidios_mm2_superficie;

        if (cropUfcMm2.isZero()) {
          return <div className="text-2xl font-bold font-mono mb-2 text-gcf-black/20">-</div>;
        }

        // ✅ diferença ABSOLUTA (não percentual)
        const diffAbs = compUfcMm2.minus(cropUfcMm2);
        const isEqual = diffAbs.isZero();
        const isConcorrenteSuperior = diffAbs.gt(0);

        return (
          <>
            <div
              className={`text-4xl sm:text-5xl md:text-6xl font-bold font-mono mb-6 tracking-tighter ${
                isEqual ? 'text-gcf-black' : isConcorrenteSuperior ? 'text-gcf-green' : 'text-gcf-black/60'
              }`}
            >
              {isEqual ? '0' : diffAbs.toFixed(0)}
            </div>

            <div className="text-[10px] font-bold text-gcf-black/40 uppercase tracking-widest">
              {isEqual ? 'Sem diferença' : isConcorrenteSuperior ? 'Concorrente superior' : 'Concorrente inferior'}
            </div>
          </>
        );
      })()}
    </div>
  </div>
</div>