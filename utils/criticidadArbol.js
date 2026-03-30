const CRITERIOS_CRITICIDAD = [
  {
    key: 'raices',
    title: 'Raices',
    items: [
      { key: 'raices_cortadas', label: 'Raices cortadas o danadas', points: 6 },
      { key: 'levantamiento_suelo', label: 'Levantamiento del suelo', points: 5 },
      { key: 'pudricion_base', label: 'Pudricion en la base', points: 6 },
      { key: 'raices_expuestas', label: 'Raices expuestas', points: 5 },
      { key: 'inclinacion_arbol', label: 'Inclinacion del arbol', points: 6 }
    ]
  },
  {
    key: 'tronco',
    title: 'Tronco',
    items: [
      { key: 'cavidades_estructurales', label: 'Cavidades estructurales', points: 6 },
      { key: 'pudricion_tronco', label: 'Pudricion del tronco', points: 5 },
      { key: 'grietas_longitudinales', label: 'Grietas longitudinales', points: 3 },
      { key: 'grietas_transversales', label: 'Grietas transversales', points: 3 },
      { key: 'exudaciones_sangrado', label: 'Exudaciones o sangrado', points: 3 },
      { key: 'dano_mecanico', label: 'Dano mecanico', points: 3 },
      { key: 'hongos_estructurales', label: 'Hongos estructurales', points: 2 }
    ]
  },
  {
    key: 'copa',
    title: 'Copa',
    items: [
      { key: 'ramas_codominantes', label: 'Ramas codominantes', points: 2 },
      { key: 'uniones_debiles', label: 'Uniones debiles', points: 4 },
      { key: 'ramas_secas_grandes', label: 'Ramas secas grandes', points: 4 },
      { key: 'ramas_colgantes', label: 'Ramas colgantes', points: 4 },
      { key: 'desbalance_copa', label: 'Desbalance de copa', points: 5 },
      { key: 'peso_lateral_excesivo', label: 'Peso lateral excesivo', points: 4 },
      { key: 'defoliacion_severa', label: 'Defoliacion severa', points: 1 },
      { key: 'dano_viento', label: 'Dano por viento', points: 1 }
    ]
  },
  {
    key: 'estructural',
    title: 'Estructural',
    items: [
      { key: 'inclusion_corteza', label: 'Inclusion de corteza', points: 3 },
      { key: 'historial_fallas', label: 'Historial de fallas', points: 5 },
      { key: 'interferencia_infraestructura', label: 'Interferencia con infraestructura', points: 4 },
      { key: 'contacto_cables', label: 'Contacto con cables', points: 4 },
      { key: 'podas_inadecuadas', label: 'Podas inadecuadas', points: 3 },
      { key: 'inclinado_hacia_via', label: 'Arbol inclinado hacia la via', points: 3 }
    ]
  }
];

const NIVELES_CRITICIDAD = [
  { key: 'baja', label: 'Baja', min: 0, max: 20, color: '#43a047', accent: '#d9f2df' },
  { key: 'media', label: 'Media', min: 21, max: 40, color: '#fdd835', accent: '#fff5c2' },
  { key: 'alta', label: 'Alta', min: 41, max: 60, color: '#fb8c00', accent: '#ffe0b8' },
  { key: 'muy_alta', label: 'Muy alta', min: 61, max: 80, color: '#e53935', accent: '#ffd7d6' },
  { key: 'critica', label: 'Critica', min: 81, max: 100, color: '#7b1f1f', accent: '#efc7c7' }
];

const CRITERIOS_ESPECIALES = {
  contacto_cables: 'alta',
  pudricion_base: 'alta',
  cavidades_estructurales: 'alta',
  historial_fallas: 'alta'
};

const buildCriteriaIndex = () => {
  const index = {};
  CRITERIOS_CRITICIDAD.forEach((group) => {
    group.items.forEach((item) => {
      index[item.key] = {
        ...item,
        groupKey: group.key,
        groupTitle: group.title
      };
    });
  });
  return index;
};

const CRITERIA_INDEX = buildCriteriaIndex();

export const getMaxCriticidadScore = () => {
  return CRITERIOS_CRITICIDAD.reduce((total, group) => {
    return total + group.items.reduce((groupTotal, item) => groupTotal + item.points, 0);
  }, 0);
};

export const getNivelCriticidad = (score, selectedKeys = []) => {
  const safeScore = Math.max(0, Math.min(getMaxCriticidadScore(), Number(score) || 0));
  let currentLevel = NIVELES_CRITICIDAD.find((level) => safeScore >= level.min && safeScore <= level.max) || NIVELES_CRITICIDAD[0];

  selectedKeys.forEach((key) => {
    const minimumLevelKey = CRITERIOS_ESPECIALES[key];
    if (!minimumLevelKey) return;
    const minimumLevel = NIVELES_CRITICIDAD.find((level) => level.key === minimumLevelKey);
    if (!minimumLevel) return;
    if (minimumLevel.min > currentLevel.min) {
      currentLevel = minimumLevel;
    }
  });

  return currentLevel;
};

export const calcularCriticidad = (selectedKeys = []) => {
  const uniqueKeys = Array.from(new Set((selectedKeys || []).filter(Boolean)));
  const selectedItems = uniqueKeys
    .map((key) => CRITERIA_INDEX[key])
    .filter(Boolean);

  const score = selectedItems.reduce((total, item) => total + item.points, 0);
  const nivel = getNivelCriticidad(score, uniqueKeys);

  return {
    score,
    maxScore: getMaxCriticidadScore(),
    levelKey: nivel.key,
    levelLabel: nivel.label,
    color: nivel.color,
    accent: nivel.accent,
    selectedCount: selectedItems.length,
    selectedKeys: uniqueKeys,
    selectedItems
  };
};

export const getCriticidadConfig = () => {
  return {
    groups: CRITERIOS_CRITICIDAD,
    levels: NIVELES_CRITICIDAD,
    maxScore: getMaxCriticidadScore()
  };
};
