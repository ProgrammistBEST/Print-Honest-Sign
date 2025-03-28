function getCategoryByModel(model) {
    const modelMapping = {
      men: ["065", "067", "080", "086"],
      women_slippers: ["072", "079", "073", "077", "075", "0076"],
      kids_crocs: ["084", "085", "094", "095"],
      women_crocs: ["090", "093", "096", "097", "098"],
      crocs_1: ["030", "031", "032", "033", "034", "035", "036"],
      crocs_2: ["040", "041"],
      winter_1: ["60", "61", "62", "63"],
      winter_2: ["90", "91", "70", "71", "72", "73"],
      winter_3: ["100", "110", "180", "380", "102", "103", "105"],
      winter_4: ["401", "402", "400", "411", "412", "410", "10", "32", "34", "36", "37", "80"],
      winter_5: ["81", "82", "83", "84"],
      general: ["ЭВА"],
    };
  
    for (const [category, models] of Object.entries(modelMapping)) {
      if (models.includes(model)) {
        return category;
      }
    }
  
    return 'not_defined';
}
  
// Определение имени таблицы на основе категории
function getTableName(brand, category) {
  const tableMapping = {
    men: `${brand}_men`,
    women_slippers: `${brand}_women_slippers`,
    kids_crocs: `${brand}_kids_crocs`,
    women_crocs: `${brand}_women_crocs`,
    crocs_1: `${brand}_crocs_1`,
    crocs_2: `${brand}_crocs_2`,
    winter_1: `${brand}_winter_1`,
    winter_2: `${brand}_winter_2`,
    winter_3: `${brand}_winter_3`,
    winter_4: `${brand}_winter_4`,
    winter_5: `${brand}_winter_5`,
    general: `${brand}_general`,
    not_defined: `${brand}_not_defined`,
  };

  return tableMapping[category] || null; // Возвращаем имя таблицы или null, если категория не найдена
}  

module.exports = { getCategoryByModel, getTableName };