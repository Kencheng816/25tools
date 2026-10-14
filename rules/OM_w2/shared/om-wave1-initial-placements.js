/* OM Wave 2 calibrated initial layer state.
 * Sources: existing OM calibration presets + user-provided 校正檔案.zip + 校正檔案_02.zip + 初始值校正.zip.
 * Correction JSONs are used as per-banner initial presentation state without copying dynamic text content.
 * 校正檔案_02 updates initial geometry; 初始值校正 restores the Smart Product group geometry and canonical Auto Price typography for the identified layouts.
 * P/P_01/P_02/P_範圍 and Auto Price are kept from the same correction source so Smart Asset captures a consistent price/product ratio.
 * Price font sizes for the identified outliers are normalized against unaffected layouts of the same asset family (2-decimal runtime precision).
 * Geometry/state is preserved for matching layers; DECO_XX additionally preserves asset filename/candidates/project.
 * centerX/centerY are normalized from x/y/width/height when applied to avoid stale editor-export centers.
 */
(function registerOmWave1InitialPlacements() {
  'use strict';
  const placements = {
  "Appier_160x600|banner6": {
    "sourceFile": "Appier_banner6_160x600_edited.json",
    "layers": {
      "P_範圍": {
        "x": 2,
        "y": 383,
        "width": 157,
        "height": 139,
        "centerX": 80.5,
        "centerY": 452.5
      },
      "P_01": {
        "x": 95.68,
        "y": 448.09,
        "width": 62.53,
        "height": 62.44,
        "centerX": 126.945,
        "centerY": 479.31,
        "rotation": 0
      },
      "P_02": {
        "x": 3.05,
        "y": 393.79,
        "width": 141.49,
        "height": 109.74,
        "centerX": 73.795,
        "centerY": 448.66,
        "rotation": 0
      }
    }
  },
  "Appier_300x600|banner6": {
    "sourceFile": "Appier_banner6_300x600_edited.json",
    "layers": {
      "P_範圍": {
        "x": 11,
        "y": 341,
        "width": 267,
        "height": 235,
        "centerX": 144.5,
        "centerY": 458.5
      },
      "P_01": {
        "x": 177.28,
        "y": 437.73,
        "width": 107.64,
        "height": 106.7,
        "centerX": 231.1,
        "centerY": 491.08,
        "rotation": 0
      },
      "P_02": {
        "x": 13.41,
        "y": 346.08,
        "width": 239.19,
        "height": 184.77,
        "centerX": 133.005,
        "centerY": 438.465,
        "rotation": 0
      }
    }
  },
  "Appier_320x50|banner6": {
    "sourceFile": "Appier_banner6_320x50_edited.json",
    "layers": {
      "P_範圍": {
        "x": 153,
        "y": -3,
        "width": 58,
        "height": 52,
        "centerX": 182,
        "centerY": 23
      },
      "P_01": {
        "x": 193.12,
        "y": 19.03,
        "width": 25.33,
        "height": 25.29,
        "centerX": 205.785,
        "centerY": 31.675,
        "rotation": 0
      },
      "P_02": {
        "x": 149.53,
        "y": 2.6,
        "width": 55.02,
        "height": 42.55,
        "centerX": 177.04,
        "centerY": 23.875,
        "rotation": 0
      }
    }
  },
  "Appier_320x480|banner6": {
    "sourceFile": "Appier_banner6_320x480_edited.json",
    "layers": {
      "P_範圍": {
        "x": 38,
        "y": 253,
        "width": 244,
        "height": 215,
        "centerX": 160,
        "centerY": 360.5
      },
      "P_01": {
        "x": 191.91,
        "y": 342.06,
        "width": 98.94,
        "height": 97.21,
        "centerX": 241.38,
        "centerY": 390.665,
        "rotation": 0
      },
      "P_02": {
        "x": 37.22,
        "y": 256.63,
        "width": 224.59,
        "height": 172.45,
        "centerX": 149.515,
        "centerY": 342.855,
        "rotation": 0
      }
    }
  },
  "Appier_336x280|banner6": {
    "sourceFile": "Appier_banner6_336x280_edited.json",
    "layers": {
      "P_範圍": {
        "x": 82,
        "y": 124,
        "width": 172,
        "height": 150,
        "centerX": 168,
        "centerY": 199
      },
      "P_01": {
        "x": 189.88,
        "y": 178.85,
        "width": 77.57,
        "height": 77.45,
        "centerX": 228.665,
        "centerY": 217.575,
        "rotation": 0
      },
      "P_02": {
        "x": 52.75,
        "y": 124.96,
        "width": 175.18,
        "height": 136.62,
        "centerX": 140.34,
        "centerY": 193.27,
        "rotation": 0
      }
    }
  },
  "Appier_480x320|banner6": {
    "sourceFile": "Appier_banner6_480x320_edited.json",
    "layers": {
      "P_範圍": {
        "x": 156,
        "y": 150.7,
        "width": 163.8,
        "height": 143.3,
        "centerX": 237.9,
        "centerY": 222.35
      },
      "P_01": {
        "x": 257.3,
        "y": 204.2,
        "width": 83.6,
        "height": 83.2,
        "centerX": 299.1,
        "centerY": 245.8,
        "rotation": 0
      },
      "P_02": {
        "x": 114.3,
        "y": 149.3,
        "width": 180.1,
        "height": 140.1,
        "centerX": 204.35,
        "centerY": 219.35,
        "rotation": 0
      }
    }
  },
  "Appier_600x500|banner6": {
    "sourceFile": "Appier_banner6_600x500_edited.json",
    "layers": {
      "P_範圍": {
        "x": 152.9,
        "y": 219.8,
        "width": 295.3,
        "height": 259.4,
        "centerX": 300.55,
        "centerY": 349.5
      },
      "P_01": {
        "x": 283.49,
        "y": 296.42,
        "width": 156.91,
        "height": 155.92,
        "centerX": 361.945,
        "centerY": 374.38,
        "rotation": 0
      },
      "P_02": {
        "x": 83.19,
        "y": 214.88,
        "width": 296.88,
        "height": 231.7,
        "centerX": 231.63,
        "centerY": 330.73,
        "rotation": 0
      }
    }
  },
  "Appier_600x1200|banner6": {
    "sourceFile": "Appier_banner6_600x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 51,
        "y": 645,
        "width": 500,
        "height": 438,
        "centerX": 301,
        "centerY": 864
      },
      "P_01": {
        "x": 299.3,
        "y": 842.8,
        "width": 238.4,
        "height": 237.2,
        "centerX": 418.5,
        "centerY": 961.4,
        "rotation": 0
      },
      "P_02": {
        "x": 18.8,
        "y": 660,
        "width": 457.8,
        "height": 356.1,
        "centerX": 247.7,
        "centerY": 838.05,
        "rotation": 0
      }
    }
  },
  "Appier_640x100|banner6": {
    "sourceFile": "Appier_banner6_640x100_edited.json",
    "layers": {
      "P_範圍": {
        "x": 315,
        "y": -5,
        "width": 116,
        "height": 102,
        "centerX": 373,
        "centerY": 46
      },
      "P_01": {
        "x": 388.1,
        "y": 38.91,
        "width": 51.45,
        "height": 50.58,
        "centerX": 413.825,
        "centerY": 64.2,
        "rotation": 0
      },
      "P_02": {
        "x": 303.72,
        "y": 4.88,
        "width": 114.54,
        "height": 88.47,
        "centerX": 360.99,
        "centerY": 49.115,
        "rotation": 0
      }
    }
  },
  "Appier_640x200|banner6": {
    "sourceFile": "Appier_banner6_640x200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 360.2,
        "y": 10.4,
        "width": 205.7,
        "height": 180.2,
        "centerX": 463.05,
        "centerY": 100.5
      },
      "P_01": {
        "x": 494.08,
        "y": 82.4,
        "width": 83.64,
        "height": 84.26,
        "centerX": 535.9,
        "centerY": 124.53,
        "rotation": 0
      },
      "P_02": {
        "x": 331.3,
        "y": 11.8,
        "width": 206.6,
        "height": 159.53,
        "centerX": 434.6,
        "centerY": 91.565,
        "rotation": 0
      }
    }
  },
  "Appier_640x960|banner6": {
    "sourceFile": "Appier_banner6_640x960_edited.json",
    "layers": {
      "P_範圍": {
        "x": 104,
        "y": 544,
        "width": 431,
        "height": 380,
        "centerX": 319.5,
        "centerY": 734
      },
      "P_01": {
        "x": 318.6,
        "y": 681.8,
        "width": 213.5,
        "height": 212.4,
        "centerX": 425.35,
        "centerY": 788,
        "rotation": 0
      },
      "P_02": {
        "x": 43.5,
        "y": 537.4,
        "width": 410.1,
        "height": 319,
        "centerX": 248.55,
        "centerY": 696.9,
        "rotation": 0
      }
    }
  },
  "Appier_672x560|banner6": {
    "sourceFile": "Appier_banner6_672x560_edited.json",
    "layers": {
      "P_範圍": {
        "x": 175.7,
        "y": 245.5,
        "width": 321.7,
        "height": 284,
        "centerX": 336.55,
        "centerY": 387.5
      },
      "P_01": {
        "x": 356.4,
        "y": 328.6,
        "width": 179.6,
        "height": 178.7,
        "centerX": 446.2,
        "centerY": 417.95,
        "rotation": 0
      },
      "P_02": {
        "x": 87.4,
        "y": 235.8,
        "width": 358.2,
        "height": 278.6,
        "centerX": 266.5,
        "centerY": 375.1,
        "rotation": 0
      }
    }
  },
  "Appier_960x640|banner6": {
    "sourceFile": "Appier_banner6_960x640_edited.json",
    "layers": {
      "P_範圍": {
        "x": 271,
        "y": 258,
        "width": 419,
        "height": 370,
        "centerX": 480.5,
        "centerY": 443
      },
      "P_01": {
        "x": 519.2,
        "y": 403.3,
        "width": 213.7,
        "height": 212.6,
        "centerX": 626.05,
        "centerY": 509.6,
        "rotation": 0
      },
      "P_02": {
        "x": 158.9,
        "y": 258.5,
        "width": 479.5,
        "height": 372.9,
        "centerX": 398.65,
        "centerY": 444.95,
        "rotation": 0
      }
    }
  },
  "Appier_970x250|banner6": {
    "sourceFile": "Appier_banner6_970x250_edited.json",
    "layers": {
      "P_範圍": {
        "x": 571,
        "y": 5,
        "width": 273,
        "height": 240,
        "centerX": 707.5,
        "centerY": 125
      },
      "P_01": {
        "x": 730.3,
        "y": 108.5,
        "width": 97.2,
        "height": 96.7,
        "centerX": 778.9,
        "centerY": 156.85,
        "rotation": 0
      },
      "P_02": {
        "x": 549.7,
        "y": 4.9,
        "width": 257.1,
        "height": 200,
        "centerX": 678.25,
        "centerY": 104.9,
        "rotation": 0
      }
    }
  },
  "Appier_1200x627|banner6": {
    "sourceFile": "Appier_banner6_1200x627_edited.json",
    "layers": {
      "P_範圍": {
        "x": 577,
        "y": 47,
        "width": 606,
        "height": 533,
        "centerX": 880,
        "centerY": 313.5
      },
      "P_01": {
        "x": 885.3,
        "y": 284.2,
        "width": 247.7,
        "height": 246.4,
        "centerX": 1009.15,
        "centerY": 407.4,
        "rotation": 0
      },
      "P_02": {
        "x": 561.8,
        "y": 88.9,
        "width": 514.9,
        "height": 400.5,
        "centerX": 819.25,
        "centerY": 289.15,
        "rotation": 0
      }
    }
  },
  "Appier_1536x2048|banner6": {
    "sourceFile": "Appier_banner6_1536x2048_edited.json",
    "layers": {
      "P_範圍": {
        "x": 260,
        "y": 1081,
        "width": 1018,
        "height": 896,
        "centerX": 769,
        "centerY": 1529
      },
      "P_01": {
        "x": 820.06,
        "y": 1443.85,
        "width": 451.94,
        "height": 449.7,
        "centerX": 1046.03,
        "centerY": 1668.7,
        "rotation": 0
      },
      "P_02": {
        "x": 122.95,
        "y": 1064.81,
        "width": 1020.76,
        "height": 796.19,
        "centerX": 633.33,
        "centerY": 1462.905,
        "rotation": 0
      }
    }
  },
  "Appier_2048x1536|banner6": {
    "sourceFile": "Appier_banner6_2048x1536_edited.json",
    "layers": {
      "P_範圍": {
        "x": 527,
        "y": 626,
        "width": 996,
        "height": 876,
        "centerX": 1025,
        "centerY": 1064
      },
      "P_01": {
        "x": 1124.34,
        "y": 947.75,
        "width": 470.93,
        "height": 467.09,
        "centerX": 1359.805,
        "centerY": 1181.295,
        "rotation": 0
      },
      "P_02": {
        "x": 331.19,
        "y": 628.32,
        "width": 1053.33,
        "height": 821.95,
        "centerX": 857.855,
        "centerY": 1039.295,
        "rotation": 0
      }
    }
  },
  "Rtbhouse_300x250|banner4": {
    "sourceFile": "Rtbhouse_banner4_300x250_edited.json",
    "layers": {
      "P_範圍": {
        "x": 84,
        "y": 126,
        "width": 132,
        "height": 117,
        "centerX": 150,
        "centerY": 184.5
      },
      "P_02": {
        "x": 166.4,
        "y": 132.1,
        "width": 35.1,
        "height": 93.6,
        "centerX": 183.95,
        "centerY": 178.9,
        "rotation": 0
      },
      "P_01": {
        "x": 90.5,
        "y": 128.2,
        "width": 66.9,
        "height": 101.3,
        "centerX": 123.95,
        "centerY": 178.85,
        "rotation": 0
      }
    }
  },
  "Rtbhouse_320x50|banner4": {
    "sourceFile": "Rtbhouse_banner4_320x50_edited.json",
    "layers": {
      "P_範圍": {
        "x": 250,
        "y": -1,
        "width": 58,
        "height": 52,
        "centerX": 279,
        "centerY": 25
      },
      "P_02": {
        "x": 285.09,
        "y": 7.7,
        "width": 12.34,
        "height": 34.23,
        "centerX": 291.26,
        "centerY": 24.815,
        "rotation": 0
      },
      "P_01": {
        "x": 258.25,
        "y": 4.99,
        "width": 25.44,
        "height": 38.03,
        "centerX": 270.97,
        "centerY": 24.005,
        "rotation": 0
      }
    }
  },
  "Rtbhouse_320x480|banner4": {
    "sourceFile": "Rtbhouse_banner4_320x480_edited.json",
    "layers": {
      "P_範圍": {
        "x": 35,
        "y": 250,
        "width": 250,
        "height": 220,
        "centerX": 160,
        "centerY": 360
      },
      "P_02": {
        "x": 185,
        "y": 277.7,
        "width": 56,
        "height": 149.3,
        "centerX": 213,
        "centerY": 352.35,
        "rotation": 0
      },
      "P_01": {
        "x": 66.7,
        "y": 265.8,
        "width": 111.2,
        "height": 168.3,
        "centerX": 122.3,
        "centerY": 349.95,
        "rotation": 0
      }
    }
  },
  "Rtbhouse_480x320|banner4": {
    "sourceFile": "Rtbhouse_banner4_480x320_edited.json",
    "layers": {
      "P_範圍": {
        "x": 147,
        "y": 150,
        "width": 187,
        "height": 165,
        "centerX": 240.5,
        "centerY": 232.5
      },
      "P_02": {
        "x": 260.3,
        "y": 162.5,
        "width": 46.3,
        "height": 123.5,
        "centerX": 283.45,
        "centerY": 224.25,
        "rotation": 0
      },
      "P_01": {
        "x": 155,
        "y": 153.6,
        "width": 91.9,
        "height": 139.1,
        "centerX": 200.95,
        "centerY": 223.15,
        "rotation": 0
      }
    }
  },
  "Template_1200x628|banner1": {
    "sourceFile": "Template_banner1_1200x628_edited.json",
    "layers": {
      "P_範圍": {
        "x": 709,
        "y": 113,
        "width": 482,
        "height": 423,
        "centerX": 950,
        "centerY": 324.5
      },
      "P": {
        "x": 761,
        "y": 257,
        "width": 406,
        "height": 188,
        "centerX": 964,
        "centerY": 351
      },
      "P_01": {
        "x": 923,
        "y": 197,
        "width": 240,
        "height": 327,
        "centerX": 1043,
        "centerY": 360.5
      },
      "P_02": {
        "x": 778,
        "y": 125,
        "width": 155,
        "height": 406,
        "centerX": 855.5,
        "centerY": 328
      },
      "__auto_price_v2_single": {
        "x": 858.43,
        "y": 336.35,
        "width": 317.46,
        "height": 69.22,
        "centerX": 1017.16,
        "centerY": 370.96,
        "rotation": 4.81,
        "fontSizePx": 64.1,
        "fontSizePt": 64.1,
        "lineHeight": 69.22,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0
      }
    }
  },
  "Template_1200x628|banner3": {
    "sourceFile": "Template_banner3_1200x628_edited.json",
    "layers": {
      "P_01": {
        "x": 923,
        "y": 197,
        "width": 240,
        "height": 327,
        "centerX": 1043,
        "centerY": 360.5
      },
      "P_02": {
        "x": 778,
        "y": 125,
        "width": 155,
        "height": 406,
        "centerX": 855.5,
        "centerY": 328
      },
      "P_範圍": {
        "x": 709,
        "y": 113,
        "width": 482,
        "height": 423,
        "centerX": 950,
        "centerY": 324.5
      },
      "P": {
        "x": 761,
        "y": 257,
        "width": 406,
        "height": 188,
        "centerX": 964,
        "centerY": 351
      }
    }
  },
  "Template_1200x628|banner4": {
    "sourceFile": "Template_banner4_1200x628_edited.json",
    "layers": {
      "P_01": {
        "x": 786.84,
        "y": 166.8,
        "width": 240,
        "height": 362.37,
        "centerX": 906.84,
        "centerY": 347.985,
        "rotation": 0
      },
      "P_02": {
        "x": 1029.33,
        "y": 170.92,
        "width": 130.17,
        "height": 348.21,
        "centerX": 1094.415,
        "centerY": 345.025,
        "rotation": 0
      },
      "P_範圍": {
        "x": 765.6,
        "y": 141,
        "width": 454.7,
        "height": 399.1,
        "centerX": 992.95,
        "centerY": 340.55
      },
      "P": {
        "x": 814.64,
        "y": 276.86,
        "width": 383.06,
        "height": 177.38,
        "centerX": 1006.17,
        "centerY": 365.55,
        "rotation": 0
      }
    }
  },
  "Template_1200x628|banner5": {
    "sourceFile": "Template_banner5_1200x628_edited.json",
    "layers": {
      "P_01": {
        "x": 829.48,
        "y": 166.16,
        "width": 321.22,
        "height": 183.18,
        "centerX": 990.09,
        "centerY": 257.75,
        "rotation": 0
      },
      "P_02": {
        "x": 781.29,
        "y": 317.22,
        "width": 371.49,
        "height": 226.78,
        "centerX": 967.035,
        "centerY": 430.61,
        "rotation": 0
      },
      "P_範圍": {
        "x": 743.6,
        "y": 154,
        "width": 454.7,
        "height": 399.1,
        "centerX": 970.95,
        "centerY": 353.55
      },
      "P": {
        "x": 792.63,
        "y": 289.86,
        "width": 383.06,
        "height": 177.38,
        "centerX": 984.16,
        "centerY": 378.55,
        "rotation": 0
      }
    }
  },
  "Template_1200x628|banner6": {
    "sourceFile": "Template_banner6_1200x628_edited.json",
    "layers": {
      "P_01": {
        "x": 972.43,
        "y": 300.43,
        "width": 190.08,
        "height": 188.63,
        "centerX": 1067.47,
        "centerY": 394.745,
        "rotation": 0
      },
      "P_02": {
        "x": 754.16,
        "y": 197.15,
        "width": 330.61,
        "height": 257.98,
        "centerX": 919.465,
        "centerY": 326.14,
        "rotation": 0
      },
      "P_範圍": {
        "x": 810.9,
        "y": 186.6,
        "width": 360.2,
        "height": 316.1,
        "centerX": 991,
        "centerY": 344.65
      },
      "P": {
        "x": 849.76,
        "y": 294.2,
        "width": 303.4,
        "height": 140.5,
        "centerX": 1001.46,
        "centerY": 364.45,
        "rotation": 0
      }
    }
  },
  "Template_1200x1200|banner1": {
    "sourceFile": "Template_banner1_1200x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 252,
        "y": 565,
        "width": 695,
        "height": 612,
        "centerX": 599.5,
        "centerY": 871
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818
      },
      "P_01": {
        "x": 575,
        "y": 666,
        "width": 339,
        "height": 463,
        "centerX": 744.5,
        "centerY": 897.5
      },
      "P_02": {
        "x": 365,
        "y": 564,
        "width": 221,
        "height": 577,
        "centerX": 475.5,
        "centerY": 852.5
      },
      "__auto_price_v2_single": {
        "x": 343.3,
        "y": 789.3,
        "width": 717.8,
        "height": 163.3,
        "centerX": 702.2,
        "centerY": 870.95,
        "rotation": 4.81,
        "fontSizePx": 144.93,
        "fontSizePt": 144.93,
        "lineHeight": 156.52,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0
      }
    }
  },
  "Template_1200x1200|banner3": {
    "sourceFile": "Template_banner3_1200x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 252,
        "y": 565,
        "width": 695,
        "height": 612,
        "centerX": 599.5,
        "centerY": 871
      },
      "P_01": {
        "x": 575,
        "y": 666,
        "width": 339,
        "height": 463,
        "centerX": 744.5,
        "centerY": 897.5
      },
      "P_02": {
        "x": 365,
        "y": 564,
        "width": 221,
        "height": 577,
        "centerX": 475.5,
        "centerY": 852.5
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818
      }
    }
  },
  "Template_1200x1200|banner4": {
    "sourceFile": "Template_banner4_1200x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 252,
        "y": 565,
        "width": 695,
        "height": 612,
        "centerX": 599.5,
        "centerY": 871
      },
      "P_01": {
        "x": 298.2,
        "y": 584.9,
        "width": 359.3,
        "height": 543.8,
        "centerX": 477.85,
        "centerY": 856.8
      },
      "P_02": {
        "x": 669.4,
        "y": 592,
        "width": 196.7,
        "height": 524.5,
        "centerX": 767.75,
        "centerY": 854.25
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818
      }
    }
  },
  "Template_1200x1200|banner5": {
    "sourceFile": "Template_banner5_1200x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 252,
        "y": 565,
        "width": 695,
        "height": 612,
        "centerX": 599.5,
        "centerY": 871
      },
      "P_01": {
        "x": 398.8,
        "y": 561,
        "width": 480.9,
        "height": 274.9,
        "centerX": 639.25,
        "centerY": 698.45
      },
      "P_02": {
        "x": 325.5,
        "y": 794.8,
        "width": 561.4,
        "height": 341.6,
        "centerX": 606.2,
        "centerY": 965.6
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818
      }
    }
  },
  "Template_1200x1200|banner6": {
    "sourceFile": "Template_banner6_1200x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 252,
        "y": 565,
        "width": 695,
        "height": 612,
        "centerX": 599.5,
        "centerY": 871
      },
      "P_01": {
        "x": 578.4,
        "y": 763.7,
        "width": 359.3,
        "height": 357.4,
        "centerX": 758.05,
        "centerY": 942.4
      },
      "P_02": {
        "x": 158.3,
        "y": 566.3,
        "width": 630.8,
        "height": 490.6,
        "centerX": 473.7,
        "centerY": 811.6
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818
      }
    }
  },
  "UAC_Pmax_LineLAP_960x1200|banner1": {
    "sourceFile": "UAC_Pmax_LineLAP_banner1_960x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 121,
        "y": 546,
        "width": 719,
        "height": 633,
        "centerX": 480.5,
        "centerY": 862.5
      },
      "P": {
        "x": 59,
        "y": 584,
        "width": 820,
        "height": 442,
        "centerX": 469,
        "centerY": 805
      },
      "P_01": {
        "x": 460,
        "y": 650,
        "width": 311,
        "height": 423,
        "centerX": 615.5,
        "centerY": 861.5
      },
      "P_02": {
        "x": 269,
        "y": 557,
        "width": 202,
        "height": 527,
        "centerX": 370,
        "centerY": 820.5
      },
      "__auto_price_v2_single": {
        "x": 265.8,
        "y": 759.2,
        "width": 623.2,
        "height": 187.4,
        "centerX": 577.4,
        "centerY": 852.9,
        "rotation": 5.28,
        "fontSizePx": 125.83,
        "fontSizePt": 125.83,
        "lineHeight": 135.9,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_960x1200|banner3": {
    "sourceFile": "UAC_Pmax_LineLAP_banner3_960x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 121,
        "y": 546,
        "width": 719,
        "height": 633,
        "centerX": 480.5,
        "centerY": 862.5
      },
      "P": {
        "x": 59,
        "y": 584,
        "width": 820,
        "height": 442,
        "centerX": 469,
        "centerY": 805
      },
      "P_02": {
        "x": 243.67,
        "y": 563.44,
        "width": 195.13,
        "height": 508.97,
        "centerX": 341.235,
        "centerY": 817.925,
        "rotation": 0
      },
      "P_01": {
        "x": 505.31,
        "y": 674.64,
        "width": 303.73,
        "height": 413.56,
        "centerX": 657.175,
        "centerY": 881.42,
        "rotation": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_960x1200|banner4": {
    "sourceFile": "UAC_Pmax_LineLAP_banner4_960x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 98.4,
        "y": 518,
        "width": 762.1,
        "height": 671,
        "centerX": 479.45,
        "centerY": 853.5
      },
      "P": {
        "x": 32.65,
        "y": 558.29,
        "width": 869.23,
        "height": 468.53,
        "centerX": 467.265,
        "centerY": 792.555,
        "rotation": 0
      },
      "P_02": {
        "x": 557.11,
        "y": 579.21,
        "width": 184.09,
        "height": 488.88,
        "centerX": 649.155,
        "centerY": 823.65,
        "rotation": 0
      },
      "P_01": {
        "x": 193.61,
        "y": 563.05,
        "width": 341.15,
        "height": 515.94,
        "centerX": 364.185,
        "centerY": 821.02,
        "rotation": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_960x1200|banner5": {
    "sourceFile": "UAC_Pmax_LineLAP_banner5_960x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 121,
        "y": 546,
        "width": 719,
        "height": 633,
        "centerX": 480.5,
        "centerY": 862.5
      },
      "P": {
        "x": 59,
        "y": 584,
        "width": 820,
        "height": 442,
        "centerX": 469,
        "centerY": 805
      },
      "P_02": {
        "x": 224.7,
        "y": 767.9,
        "width": 525.4,
        "height": 319.7,
        "centerX": 487.4,
        "centerY": 927.75,
        "rotation": 0
      },
      "P_01": {
        "x": 278.2,
        "y": 544.1,
        "width": 430.9,
        "height": 246.4,
        "centerX": 493.65,
        "centerY": 667.3,
        "rotation": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_960x1200|banner6": {
    "sourceFile": "UAC_Pmax_LineLAP_banner6_960x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 121,
        "y": 546,
        "width": 719,
        "height": 633,
        "centerX": 480.5,
        "centerY": 862.5
      },
      "P": {
        "x": 59,
        "y": 584,
        "width": 820,
        "height": 442,
        "centerX": 469,
        "centerY": 805
      },
      "P_01": {
        "x": 508.56,
        "y": 775.88,
        "width": 293.39,
        "height": 290.62,
        "centerX": 655.26,
        "centerY": 921.19,
        "rotation": 0
      },
      "P_02": {
        "x": 104.61,
        "y": 552.26,
        "width": 611.12,
        "height": 474.94,
        "centerX": 410.17,
        "centerY": 789.73,
        "rotation": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_1200x628|banner1": {
    "sourceFile": "UAC_Pmax_LineLAP_banner1_1200x628_edited.json",
    "layers": {
      "P_範圍": {
        "x": 689,
        "y": 90,
        "width": 510,
        "height": 449,
        "centerX": 944,
        "centerY": 314.5
      },
      "P": {
        "x": 761,
        "y": 257,
        "width": 406,
        "height": 188,
        "centerX": 964,
        "centerY": 351
      },
      "P_01": {
        "x": 923,
        "y": 197,
        "width": 240,
        "height": 327,
        "centerX": 1043,
        "centerY": 360.5
      },
      "P_02": {
        "x": 778,
        "y": 125,
        "width": 155,
        "height": 406,
        "centerX": 855.5,
        "centerY": 328
      },
      "__auto_price_v2_single": {
        "x": 858.43,
        "y": 336.35,
        "width": 317.46,
        "height": 69.22,
        "centerX": 1017.16,
        "centerY": 370.96,
        "rotation": 4.81,
        "fontSizePx": 64.1,
        "fontSizePt": 64.1,
        "lineHeight": 69.22,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_1200x628|banner3": {
    "sourceFile": "UAC_Pmax_LineLAP_banner3_1200x628_edited.json",
    "layers": {
      "P_02": {
        "x": 773.17,
        "y": 132.86,
        "width": 150.58,
        "height": 393.46,
        "centerX": 848.46,
        "centerY": 329.59,
        "rotation": 0
      },
      "P_01": {
        "x": 942.67,
        "y": 211.91,
        "width": 233.06,
        "height": 318.61,
        "centerX": 1059.2,
        "centerY": 371.215,
        "rotation": 0
      },
      "P_範圍": {
        "x": 689,
        "y": 90,
        "width": 510,
        "height": 449,
        "centerX": 944,
        "centerY": 314.5
      },
      "P": {
        "x": 761,
        "y": 257,
        "width": 406,
        "height": 188,
        "centerX": 964,
        "centerY": 351
      }
    }
  },
  "UAC_Pmax_LineLAP_1200x628|banner4": {
    "sourceFile": "UAC_Pmax_LineLAP_banner4_1200x628_edited.json",
    "layers": {
      "P_02": {
        "x": 1019.26,
        "y": 198.66,
        "width": 119.28,
        "height": 317.29,
        "centerX": 1078.9,
        "centerY": 357.305,
        "rotation": 0
      },
      "P_01": {
        "x": 787.41,
        "y": 185.83,
        "width": 219.78,
        "height": 333.72,
        "centerX": 897.3,
        "centerY": 352.69,
        "rotation": 0
      },
      "P_範圍": {
        "x": 748,
        "y": 133.7,
        "width": 453.9,
        "height": 399.6,
        "centerX": 974.95,
        "centerY": 333.5
      },
      "P": {
        "x": 812.09,
        "y": 282.34,
        "width": 361.33,
        "height": 167.31,
        "centerX": 992.755,
        "centerY": 365.995,
        "rotation": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_1200x628|banner5": {
    "sourceFile": "UAC_Pmax_LineLAP_banner5_1200x628_edited.json",
    "layers": {
      "P_02": {
        "x": 769.46,
        "y": 303.95,
        "width": 382.51,
        "height": 232.21,
        "centerX": 960.715,
        "centerY": 420.055,
        "rotation": 0
      },
      "P_01": {
        "x": 821.5,
        "y": 145.7,
        "width": 311.9,
        "height": 178.3,
        "centerX": 977.45,
        "centerY": 234.85,
        "rotation": 0
      },
      "P_範圍": {
        "x": 720.4,
        "y": 120.7,
        "width": 481.1,
        "height": 423.6,
        "centerX": 960.95,
        "centerY": 332.5
      },
      "P": {
        "x": 788.31,
        "y": 278.26,
        "width": 383.03,
        "height": 177.36,
        "centerX": 979.825,
        "centerY": 366.94,
        "rotation": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_1200x628|banner6": {
    "sourceFile": "UAC_Pmax_LineLAP_banner6_1200x628_edited.json",
    "layers": {
      "P_範圍": {
        "x": 788.9,
        "y": 160.7,
        "width": 404,
        "height": 355.7,
        "centerX": 990.9,
        "centerY": 338.55
      },
      "P": {
        "x": 845.93,
        "y": 293.01,
        "width": 321.63,
        "height": 148.93,
        "centerX": 1006.74,
        "centerY": 367.48,
        "rotation": 0
      },
      "P_01": {
        "x": 1001.99,
        "y": 319.54,
        "width": 179.36,
        "height": 177.97,
        "centerX": 1091.67,
        "centerY": 408.53,
        "rotation": 0
      },
      "P_02": {
        "x": 757.62,
        "y": 187.02,
        "width": 371.48,
        "height": 289.85,
        "centerX": 943.36,
        "centerY": 331.95,
        "rotation": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_1200x1200|banner1": {
    "sourceFile": "UAC_Pmax_LineLAP_banner1_1200x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 253,
        "y": 565,
        "width": 695,
        "height": 613,
        "centerX": 600.5,
        "centerY": 871.5
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818
      },
      "P_01": {
        "x": 575,
        "y": 666,
        "width": 339,
        "height": 463,
        "centerX": 744.5,
        "centerY": 897.5
      },
      "P_02": {
        "x": 365,
        "y": 564,
        "width": 221,
        "height": 577,
        "centerX": 475.5,
        "centerY": 852.5
      },
      "__auto_price_v2_single": {
        "x": 343.3,
        "y": 789.3,
        "width": 717.8,
        "height": 163.3,
        "centerX": 702.2,
        "centerY": 870.95,
        "rotation": 4.81,
        "fontSizePx": 144.93,
        "fontSizePt": 144.93,
        "lineHeight": 156.52,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_1200x1200|banner3": {
    "sourceFile": "UAC_Pmax_LineLAP_banner3_1200x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 253,
        "y": 565,
        "width": 695,
        "height": 613,
        "centerX": 600.5,
        "centerY": 871.5
      },
      "P_02": {
        "x": 372.5,
        "y": 576.7,
        "width": 212.7,
        "height": 557.1,
        "centerX": 478.85,
        "centerY": 855.25,
        "rotation": 0
      },
      "P_01": {
        "x": 587.5,
        "y": 685.1,
        "width": 332.3,
        "height": 452.8,
        "centerX": 753.65,
        "centerY": 911.5,
        "rotation": 0
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818,
        "rotation": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_1200x1200|banner4": {
    "sourceFile": "UAC_Pmax_LineLAP_banner4_1200x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 253,
        "y": 565,
        "width": 695,
        "height": 613,
        "centerX": 600.5,
        "centerY": 871.5
      },
      "P_02": {
        "x": 674.1,
        "y": 618.8,
        "width": 189.3,
        "height": 504.8,
        "centerX": 768.75,
        "centerY": 871.2,
        "rotation": 0
      },
      "P_01": {
        "x": 301.1,
        "y": 597,
        "width": 352.1,
        "height": 532.9,
        "centerX": 477.15,
        "centerY": 863.45,
        "rotation": 0
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818
      }
    }
  },
  "UAC_Pmax_LineLAP_1200x1200|banner5": {
    "sourceFile": "UAC_Pmax_LineLAP_banner5_1200x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 253,
        "y": 565,
        "width": 695,
        "height": 613,
        "centerX": 600.5,
        "centerY": 871.5
      },
      "P_02": {
        "x": 322.7,
        "y": 787.1,
        "width": 572.7,
        "height": 348.5,
        "centerX": 609.05,
        "centerY": 961.35,
        "rotation": 0
      },
      "P_01": {
        "x": 384.6,
        "y": 551.4,
        "width": 471.3,
        "height": 269.5,
        "centerX": 620.25,
        "centerY": 686.15,
        "rotation": 0
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818,
        "rotation": 0
      }
    }
  },
  "UAC_Pmax_LineLAP_1200x1200|banner6": {
    "sourceFile": "UAC_Pmax_LineLAP_banner6_1200x1200_edited.json",
    "layers": {
      "P_範圍": {
        "x": 253,
        "y": 565,
        "width": 695,
        "height": 613,
        "centerX": 600.5,
        "centerY": 871.5
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818
      },
      "P_01": {
        "x": 623.1,
        "y": 796.2,
        "width": 319.8,
        "height": 318.1,
        "centerX": 783,
        "centerY": 955.25
      },
      "P_02": {
        "x": 180.1,
        "y": 562.7,
        "width": 668.6,
        "height": 520,
        "centerX": 514.4,
        "centerY": 822.7
      }
    }
  },
  "Appier_1200x627|banner1": {
    "sourceFile": "Appier_banner1_1200x627_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 122,
        "y": 65,
        "width": 335,
        "height": 354,
        "centerX": 289.5,
        "centerY": 242,
        "hidden": false
      },
      "副標題": {
        "x": 141,
        "y": 461,
        "width": 296,
        "height": 43,
        "centerX": 289,
        "centerY": 482.5,
        "hidden": true,
        "fontSizePx": 44.81,
        "fontSizePt": 44.81,
        "lineHeight": 53.77,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 59.5,
        "y": 451,
        "width": 149,
        "height": 52,
        "centerX": 134,
        "centerY": 477,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 213.5,
        "y": 467,
        "width": 304,
        "height": 35,
        "centerX": 365.5,
        "centerY": 484.5,
        "hidden": false,
        "fontSizePx": 36.44,
        "fontSizePt": 36.44,
        "lineHeight": 43.73,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 31.5,
        "y": 441,
        "width": 514,
        "height": 82,
        "centerX": 288.5,
        "centerY": 482,
        "hidden": false
      },
      "警語": {
        "x": 174,
        "y": 529,
        "width": 230,
        "height": 20,
        "centerX": 289,
        "centerY": 539,
        "hidden": false,
        "fontSizePx": 21,
        "fontSizePt": 21,
        "lineHeight": 25.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 546.4,
        "y": -9.6,
        "width": 642.4,
        "height": 565,
        "centerX": 867.6,
        "centerY": 272.9
      },
      "P": {
        "x": 549.59,
        "y": 153.64,
        "width": 636.02,
        "height": 344.51,
        "centerX": 867.6,
        "centerY": 325.9,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 816.71,
        "y": 181.2,
        "width": 331.79,
        "height": 330.73,
        "centerX": 982.61,
        "centerY": 346.57,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 517.79,
        "y": -13.84,
        "width": 515.18,
        "height": 401.75,
        "centerX": 775.38,
        "centerY": 187.04,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1037,
        "y": 55,
        "width": 151,
        "height": 126,
        "centerX": 1112.5,
        "centerY": 118,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 554,
        "y": 33,
        "width": 276,
        "height": 188,
        "centerX": 692,
        "centerY": 127,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1200,
        "height": 627,
        "centerX": 600,
        "centerY": 313.5,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 754.59,
        "y": 317,
        "width": 394,
        "height": 90,
        "centerX": 951.59,
        "centerY": 362,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 94.72,
        "fontSizePt": 94.72,
        "lineHeight": 102.29,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_1536x2048|banner1": {
    "sourceFile": "Appier_banner1_1536x2048_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 432,
        "y": 105,
        "width": 674,
        "height": 713,
        "centerX": 769,
        "centerY": 461.5,
        "hidden": false
      },
      "副標題": {
        "x": 494,
        "y": 878,
        "width": 548,
        "height": 79,
        "centerX": 768,
        "centerY": 917.5,
        "hidden": true,
        "fontSizePx": 82.88,
        "fontSizePt": 82.88,
        "lineHeight": 99.46,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 346.5,
        "y": 859,
        "width": 276,
        "height": 97,
        "centerX": 484.5,
        "centerY": 907.5,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 627.5,
        "y": 890,
        "width": 562,
        "height": 64,
        "centerX": 908.5,
        "centerY": 922,
        "hidden": false,
        "fontSizePx": 67.42,
        "fontSizePt": 67.42,
        "lineHeight": 80.9,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 296.5,
        "y": 841,
        "width": 943,
        "height": 152,
        "centerX": 768,
        "centerY": 917,
        "hidden": false
      },
      "警語": {
        "x": 555,
        "y": 1004,
        "width": 425,
        "height": 37,
        "centerX": 767.5,
        "centerY": 1022.5,
        "hidden": false,
        "fontSizePx": 39,
        "fontSizePt": 39,
        "lineHeight": 46.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 229.5,
        "y": 964.1,
        "width": 1079.1,
        "height": 949.8,
        "centerX": 769,
        "centerY": 1439
      },
      "P": {
        "x": 43.98,
        "y": 1046.79,
        "width": 1449.08,
        "height": 784.43,
        "centerX": 768.52,
        "centerY": 1439,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 654.57,
        "y": 1218.5,
        "width": 605.29,
        "height": 603.17,
        "centerX": 957.21,
        "centerY": 1520.09,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 96.98,
        "y": 939.71,
        "width": 963.58,
        "height": 753.69,
        "centerX": 578.77,
        "centerY": 1316.56,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1125,
        "y": 1066,
        "width": 265,
        "height": 220,
        "centerX": 1257.5,
        "centerY": 1176,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 155,
        "y": 1013,
        "width": 538,
        "height": 337,
        "centerX": 424,
        "centerY": 1181.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1536,
        "height": 2048,
        "centerX": 768,
        "centerY": 1024,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 511.87,
        "y": 1420.24,
        "width": 896,
        "height": 202,
        "centerX": 959.87,
        "centerY": 1521.24,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 215.8,
        "fontSizePt": 215.8,
        "lineHeight": 233.04,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_160x600|banner1": {
    "sourceFile": "Appier_banner1_160x600_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 16,
        "y": 102,
        "width": 128,
        "height": 136,
        "centerX": 80,
        "centerY": 170,
        "hidden": false
      },
      "副標題_上": {
        "x": 18,
        "y": 255,
        "width": 124,
        "height": 29,
        "centerX": 80,
        "centerY": 269.5,
        "hidden": false,
        "fontSizePx": 30.11,
        "fontSizePt": 30.11,
        "lineHeight": 36.13,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_下": {
        "x": 17,
        "y": 294,
        "width": 126,
        "height": 56,
        "centerX": 80,
        "centerY": 322,
        "hidden": true,
        "fontSizePx": 62.42,
        "fontSizePt": 62.42,
        "lineHeight": 74.9,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "警語": {
        "x": 14,
        "y": 363,
        "width": 131,
        "height": 12,
        "centerX": 79.5,
        "centerY": 369,
        "hidden": false,
        "fontSizePx": 12.38,
        "fontSizePt": 12.38,
        "lineHeight": 14.86,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P": {
        "x": 3,
        "y": 410,
        "width": 155,
        "height": 83,
        "centerX": 80.5,
        "centerY": 451.5,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_範圍": {
        "x": 2,
        "y": 383,
        "width": 157,
        "height": 139,
        "centerX": 80.5,
        "centerY": 452.5
      },
      "P_01": {
        "x": 72,
        "y": 430,
        "width": 79,
        "height": 79,
        "centerX": 111.5,
        "centerY": 469.5,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 4,
        "y": 392,
        "width": 126,
        "height": 98,
        "centerX": 67,
        "centerY": 441,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 93,
        "y": 535,
        "width": 63,
        "height": 52,
        "centerX": 124.5,
        "centerY": 561,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 9,
        "y": 10,
        "width": 131,
        "height": 89,
        "centerX": 74.5,
        "centerY": 54.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 160,
        "height": 600,
        "centerX": 80,
        "centerY": 300,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 52.97,
        "y": 449.2,
        "width": 96,
        "height": 22,
        "centerX": 100.97,
        "centerY": 460.2,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 23.08,
        "fontSizePt": 23.08,
        "lineHeight": 24.92,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_2048x1536|banner1": {
    "sourceFile": "Appier_banner1_2048x1536_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 810,
        "y": 71,
        "width": 429,
        "height": 96,
        "centerX": 1024.5,
        "centerY": 119,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 497,
        "y": 197,
        "width": 1054,
        "height": 146,
        "centerX": 1024,
        "centerY": 270,
        "hidden": false
      },
      "副標題": {
        "x": 519,
        "y": 416,
        "width": 1010,
        "height": 92,
        "centerX": 1024,
        "centerY": 462,
        "hidden": false,
        "fontSizePx": 97.25,
        "fontSizePt": 97.25,
        "lineHeight": 116.7,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 497,
        "y": 372,
        "width": 1054,
        "height": 178,
        "centerX": 1024,
        "centerY": 461,
        "hidden": false
      },
      "警語": {
        "x": 779,
        "y": 562,
        "width": 490,
        "height": 42,
        "centerX": 1024,
        "centerY": 583,
        "hidden": false,
        "fontSizePx": 45,
        "fontSizePt": 45,
        "lineHeight": 54,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 276.1,
        "y": 325.3,
        "width": 1497.6,
        "height": 1317.3,
        "centerX": 1024.9,
        "centerY": 984
      },
      "P_01": {
        "x": 276.02,
        "y": 325.3,
        "width": 1497.77,
        "height": 1317.3,
        "centerX": 1024.9,
        "centerY": 983.95,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 3.85,
        "y": 322.3,
        "width": 1410.53,
        "height": 1103.76,
        "centerX": 709.11,
        "centerY": 874.18,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1469,
        "y": 609,
        "width": 262,
        "height": 219,
        "centerX": 1600,
        "centerY": 718.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 255,
        "y": 606,
        "width": 472,
        "height": 321,
        "centerX": 491,
        "centerY": 766.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 2048,
        "height": 1536,
        "centerX": 1024,
        "centerY": 768,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 759.66,
        "y": 963.16,
        "width": 926,
        "height": 209,
        "centerX": 1222.66,
        "centerY": 1067.66,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 223.05,
        "fontSizePt": 223.05,
        "lineHeight": 240.9,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_300x600|banner1": {
    "sourceFile": "Appier_banner1_300x600_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 47,
        "y": 52,
        "width": 206,
        "height": 218,
        "centerX": 150,
        "centerY": 161,
        "hidden": false
      },
      "副標題": {
        "x": 78,
        "y": 290,
        "width": 145,
        "height": 21,
        "centerX": 150.5,
        "centerY": 300.5,
        "hidden": true,
        "fontSizePx": 21.91,
        "fontSizePt": 21.91,
        "lineHeight": 26.29,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 36.5,
        "y": 285,
        "width": 73,
        "height": 26,
        "centerX": 73,
        "centerY": 298,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 114.5,
        "y": 293,
        "width": 149,
        "height": 17,
        "centerX": 189,
        "centerY": 301.5,
        "hidden": false,
        "fontSizePx": 17.82,
        "fontSizePt": 17.82,
        "lineHeight": 21.38,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 22.5,
        "y": 280,
        "width": 255,
        "height": 41,
        "centerX": 150,
        "centerY": 300.5,
        "hidden": false
      },
      "警語": {
        "x": 95,
        "y": 323,
        "width": 110,
        "height": 10,
        "centerX": 150,
        "centerY": 328,
        "hidden": false,
        "fontSizePx": 10,
        "fontSizePt": 10,
        "lineHeight": 12,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 17,
        "y": 328,
        "width": 267,
        "height": 235,
        "centerX": 150.5,
        "centerY": 445.5
      },
      "P": {
        "x": 8,
        "y": 368,
        "width": 286,
        "height": 155,
        "centerX": 151,
        "centerY": 445.5,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 143,
        "y": 394,
        "width": 136,
        "height": 135,
        "centerX": 211,
        "centerY": 461.5,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 21,
        "y": 330,
        "width": 213,
        "height": 165,
        "centerX": 127.5,
        "centerY": 412.5,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 13,
        "y": 348,
        "width": 80,
        "height": 67,
        "centerX": 53,
        "centerY": 381.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 243,
        "y": 347,
        "width": 84,
        "height": 58,
        "centerX": 285,
        "centerY": 376,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 300,
        "height": 600,
        "centerX": 150,
        "centerY": 300,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 100.26,
        "y": 441.75,
        "width": 177,
        "height": 40,
        "centerX": 188.76,
        "centerY": 461.75,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 42.59,
        "fontSizePt": 42.59,
        "lineHeight": 45.99,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_320x480|banner1": {
    "sourceFile": "Appier_banner1_320x480_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 84,
        "y": 33,
        "width": 153,
        "height": 161,
        "centerX": 160.5,
        "centerY": 113.5,
        "hidden": false
      },
      "副標題": {
        "x": 98,
        "y": 209,
        "width": 123,
        "height": 18,
        "centerX": 159.5,
        "centerY": 218,
        "hidden": true,
        "fontSizePx": 18.49,
        "fontSizePt": 18.49,
        "lineHeight": 22.19,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 63,
        "y": 205,
        "width": 62,
        "height": 22,
        "centerX": 94,
        "centerY": 216,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 130,
        "y": 211,
        "width": 126,
        "height": 15,
        "centerX": 193,
        "centerY": 218.5,
        "hidden": false,
        "fontSizePx": 15.04,
        "fontSizePt": 15.04,
        "lineHeight": 18.05,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 49,
        "y": 200,
        "width": 221,
        "height": 35,
        "centerX": 159.5,
        "centerY": 217.5,
        "hidden": false
      },
      "警語": {
        "x": 110,
        "y": 237,
        "width": 101,
        "height": 9,
        "centerX": 160.5,
        "centerY": 241.5,
        "hidden": false,
        "fontSizePx": 9.13,
        "fontSizePt": 9.13,
        "lineHeight": 10.96,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 14.7,
        "y": 217.6,
        "width": 290.5,
        "height": 256.1,
        "centerX": 159.9,
        "centerY": 345.6
      },
      "P_01": {
        "x": 14.63,
        "y": 217.6,
        "width": 290.65,
        "height": 256.1,
        "centerX": 159.95,
        "centerY": 345.65,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 15.82,
        "y": 218.79,
        "width": 238.23,
        "height": 183.44,
        "centerX": 134.93,
        "centerY": 310.51,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 243,
        "y": 249,
        "width": 62,
        "height": 52,
        "centerX": 274,
        "centerY": 275,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 19,
        "y": 240,
        "width": 120,
        "height": 75,
        "centerX": 79,
        "centerY": 277.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 480,
        "centerX": 160,
        "centerY": 240,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 108.32,
        "y": 341.39,
        "width": 180,
        "height": 41,
        "centerX": 198.32,
        "centerY": 361.89,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 43.29,
        "fontSizePt": 43.29,
        "lineHeight": 46.74,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_336x280|banner1": {
    "sourceFile": "Appier_banner1_336x280_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 125,
        "y": 9,
        "width": 87,
        "height": 20,
        "centerX": 168.5,
        "centerY": 19,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 60,
        "y": 34,
        "width": 216,
        "height": 30,
        "centerX": 168,
        "centerY": 49,
        "hidden": false
      },
      "副標題": {
        "x": 103,
        "y": 79,
        "width": 129,
        "height": 20,
        "centerX": 167.5,
        "centerY": 89,
        "hidden": true,
        "fontSizePx": 19.66,
        "fontSizePt": 19.66,
        "lineHeight": 23.59,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 66.5,
        "y": 75,
        "width": 65,
        "height": 23,
        "centerX": 99,
        "centerY": 86.5,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 136.5,
        "y": 82,
        "width": 134,
        "height": 16,
        "centerX": 203.5,
        "centerY": 90,
        "hidden": false,
        "fontSizePx": 16,
        "fontSizePt": 16,
        "lineHeight": 19.2,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 60.5,
        "y": 71,
        "width": 216,
        "height": 36,
        "centerX": 168.5,
        "centerY": 89,
        "hidden": false
      },
      "警語": {
        "x": 118,
        "y": 110,
        "width": 99,
        "height": 9,
        "centerX": 167.5,
        "centerY": 114.5,
        "hidden": false,
        "fontSizePx": 9,
        "fontSizePt": 9,
        "lineHeight": 10.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 77,
        "y": 116,
        "width": 172,
        "height": 150,
        "centerX": 163,
        "centerY": 191
      },
      "P": {
        "x": 36,
        "y": 117,
        "width": 255,
        "height": 137,
        "centerX": 163.5,
        "centerY": 185.5,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 158,
        "y": 150,
        "width": 98,
        "height": 98,
        "centerX": 207,
        "centerY": 199,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 50,
        "y": 116,
        "width": 156,
        "height": 122,
        "centerX": 128,
        "centerY": 177,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 268,
        "y": 119,
        "width": 49,
        "height": 41,
        "centerX": 292.5,
        "centerY": 139.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 48,
        "y": 121,
        "width": 85,
        "height": 58,
        "centerX": 90.5,
        "centerY": 150,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 336,
        "height": 280,
        "centerX": 168,
        "centerY": 140,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 118.17,
        "y": 181.36,
        "width": 158,
        "height": 37,
        "centerX": 197.17,
        "centerY": 199.86,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 37.97,
        "fontSizePt": 37.97,
        "lineHeight": 41,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_480x320|banner1": {
    "sourceFile": "Appier_banner1_480x320_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 186,
        "y": 9,
        "width": 109,
        "height": 26,
        "centerX": 240.5,
        "centerY": 22,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 107,
        "y": 41,
        "width": 266,
        "height": 37,
        "centerX": 240,
        "centerY": 59.5,
        "hidden": false
      },
      "副標題": {
        "x": 158,
        "y": 96,
        "width": 163,
        "height": 24,
        "centerX": 239.5,
        "centerY": 108,
        "hidden": true,
        "fontSizePx": 24.59,
        "fontSizePt": 24.59,
        "lineHeight": 29.51,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 113.5,
        "y": 90,
        "width": 82,
        "height": 29,
        "centerX": 154.5,
        "centerY": 104.5,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 200.5,
        "y": 99,
        "width": 167,
        "height": 20,
        "centerX": 284,
        "centerY": 109,
        "hidden": false,
        "fontSizePx": 20,
        "fontSizePt": 20,
        "lineHeight": 24,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 107.5,
        "y": 85,
        "width": 266,
        "height": 45,
        "centerX": 240.5,
        "centerY": 107.5,
        "hidden": false
      },
      "警語": {
        "x": 179,
        "y": 133,
        "width": 123,
        "height": 11,
        "centerX": 240.5,
        "centerY": 138.5,
        "hidden": false,
        "fontSizePx": 11.2,
        "fontSizePt": 11.2,
        "lineHeight": 13.44,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 143,
        "y": 140,
        "width": 184,
        "height": 161,
        "centerX": 235,
        "centerY": 220.5
      },
      "P": {
        "x": 96,
        "y": 141,
        "width": 277,
        "height": 150,
        "centerX": 234.5,
        "centerY": 216,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 231,
        "y": 171,
        "width": 112,
        "height": 110,
        "centerX": 287,
        "centerY": 226,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 96,
        "y": 138,
        "width": 191,
        "height": 148,
        "centerX": 191.5,
        "centerY": 212,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 353,
        "y": 137,
        "width": 68,
        "height": 56,
        "centerX": 387,
        "centerY": 165,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 83,
        "y": 155,
        "width": 101,
        "height": 61,
        "centerX": 133.5,
        "centerY": 185.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 480,
        "height": 320,
        "centerX": 240,
        "centerY": 160,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 185.08,
        "y": 212.22,
        "width": 172,
        "height": 39,
        "centerX": 271.08,
        "centerY": 231.72,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 41.25,
        "fontSizePt": 41.25,
        "lineHeight": 44.55,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_600x1200|banner1": {
    "sourceFile": "Appier_banner1_600x1200_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 123,
        "y": 136,
        "width": 354,
        "height": 375,
        "centerX": 300,
        "centerY": 323.5,
        "hidden": false
      },
      "副標題": {
        "x": 158,
        "y": 543,
        "width": 285,
        "height": 41,
        "centerX": 300.5,
        "centerY": 563.5,
        "hidden": true,
        "fontSizePx": 43,
        "fontSizePt": 43,
        "lineHeight": 51.6,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 80,
        "y": 533,
        "width": 143,
        "height": 50,
        "centerX": 151.5,
        "centerY": 558,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 228,
        "y": 549,
        "width": 292,
        "height": 34,
        "centerX": 374,
        "centerY": 566,
        "hidden": false,
        "fontSizePx": 35,
        "fontSizePt": 35,
        "lineHeight": 42,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 53,
        "y": 523,
        "width": 494,
        "height": 80,
        "centerX": 300,
        "centerY": 563,
        "hidden": false
      },
      "警語": {
        "x": 185,
        "y": 608,
        "width": 230,
        "height": 20,
        "centerX": 300,
        "centerY": 618,
        "hidden": false,
        "fontSizePx": 21,
        "fontSizePt": 21,
        "lineHeight": 25.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 51,
        "y": 645,
        "width": 500,
        "height": 438,
        "centerX": 301,
        "centerY": 864
      },
      "P": {
        "x": 15,
        "y": 719,
        "width": 571,
        "height": 310,
        "centerX": 300.5,
        "centerY": 874,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 275,
        "y": 790,
        "width": 268,
        "height": 267,
        "centerX": 409,
        "centerY": 923.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 28,
        "y": 660,
        "width": 432,
        "height": 336,
        "centerX": 244,
        "centerY": 828,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 480,
        "y": 673,
        "width": 82,
        "height": 69,
        "centerX": 521,
        "centerY": 707.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 55,
        "y": 632,
        "width": 220,
        "height": 149,
        "centerX": 165,
        "centerY": 706.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 600,
        "height": 1200,
        "centerX": 300,
        "centerY": 600,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 199.4,
        "y": 866.5,
        "width": 353,
        "height": 80,
        "centerX": 375.9,
        "centerY": 906.5,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 85.03,
        "fontSizePt": 85.03,
        "lineHeight": 91.83,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_600x500|banner1": {
    "sourceFile": "Appier_banner1_600x500_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 236,
        "y": 31,
        "width": 133,
        "height": 30,
        "centerX": 302.5,
        "centerY": 46,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 136,
        "y": 71,
        "width": 330,
        "height": 46,
        "centerX": 301,
        "centerY": 94,
        "hidden": false
      },
      "副標題": {
        "x": 202,
        "y": 138,
        "width": 197,
        "height": 29,
        "centerX": 300.5,
        "centerY": 152.5,
        "hidden": true,
        "fontSizePx": 29.76,
        "fontSizePt": 29.76,
        "lineHeight": 35.71,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 147.5,
        "y": 131,
        "width": 99,
        "height": 35,
        "centerX": 197,
        "centerY": 148.5,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 251.5,
        "y": 142,
        "width": 202,
        "height": 24,
        "centerX": 352.5,
        "centerY": 154,
        "hidden": false,
        "fontSizePx": 24.22,
        "fontSizePt": 24.22,
        "lineHeight": 29.06,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 135.5,
        "y": 125,
        "width": 330,
        "height": 55,
        "centerX": 300.5,
        "centerY": 152.5,
        "hidden": false
      },
      "警語": {
        "x": 221,
        "y": 183,
        "width": 159,
        "height": 14,
        "centerX": 300.5,
        "centerY": 190,
        "hidden": false,
        "fontSizePx": 14.5,
        "fontSizePt": 14.5,
        "lineHeight": 17.4,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 144,
        "y": 208,
        "width": 313,
        "height": 275,
        "centerX": 300.5,
        "centerY": 345.5
      },
      "P": {
        "x": 73,
        "y": 222,
        "width": 453,
        "height": 246,
        "centerX": 299.5,
        "centerY": 345,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 266,
        "y": 272,
        "width": 187,
        "height": 186,
        "centerX": 359.5,
        "centerY": 365,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 68,
        "y": 208,
        "width": 297,
        "height": 231,
        "centerX": 216.5,
        "centerY": 323.5,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 428,
        "y": 204,
        "width": 79,
        "height": 66,
        "centerX": 467.5,
        "centerY": 237,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 84,
        "y": 200,
        "width": 155,
        "height": 106,
        "centerX": 161.5,
        "centerY": 253,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 600,
        "height": 500,
        "centerX": 300,
        "centerY": 250,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 219.32,
        "y": 339.29,
        "width": 280,
        "height": 63,
        "centerX": 359.32,
        "centerY": 370.79,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 67.46,
        "fontSizePt": 67.46,
        "lineHeight": 72.84,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_640x960|banner1": {
    "sourceFile": "Appier_banner1_640x960_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 154,
        "y": 63,
        "width": 333,
        "height": 351,
        "centerX": 320.5,
        "centerY": 238.5,
        "hidden": false
      },
      "副標題": {
        "x": 185,
        "y": 444,
        "width": 269,
        "height": 39,
        "centerX": 319.5,
        "centerY": 463.5,
        "hidden": true,
        "fontSizePx": 40.57,
        "fontSizePt": 40.57,
        "lineHeight": 48.68,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 112,
        "y": 435,
        "width": 135,
        "height": 47,
        "centerX": 179.5,
        "centerY": 458.5,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 252,
        "y": 450,
        "width": 275,
        "height": 32,
        "centerX": 389.5,
        "centerY": 466,
        "hidden": false,
        "fontSizePx": 33,
        "fontSizePt": 33,
        "lineHeight": 39.6,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 83,
        "y": 426,
        "width": 473,
        "height": 75,
        "centerX": 319.5,
        "centerY": 463.5,
        "hidden": false
      },
      "警語": {
        "x": 217,
        "y": 506,
        "width": 207,
        "height": 18,
        "centerX": 320.5,
        "centerY": 515,
        "hidden": false,
        "fontSizePx": 19,
        "fontSizePt": 19,
        "lineHeight": 22.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 104,
        "y": 544,
        "width": 431,
        "height": 380,
        "centerX": 319.5,
        "centerY": 734
      },
      "P": {
        "x": 34,
        "y": 544,
        "width": 573,
        "height": 310,
        "centerX": 320.5,
        "centerY": 699,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 297,
        "y": 659,
        "width": 240,
        "height": 239,
        "centerX": 417,
        "centerY": 778.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 40,
        "y": 544,
        "width": 387,
        "height": 300,
        "centerX": 233.5,
        "centerY": 694,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 490,
        "y": 559,
        "width": 121,
        "height": 101,
        "centerX": 550.5,
        "centerY": 609.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 53,
        "y": 526,
        "width": 220,
        "height": 149,
        "centerX": 163,
        "centerY": 600.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 640,
        "height": 960,
        "centerX": 320,
        "centerY": 480,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 218.67,
        "y": 691,
        "width": 355,
        "height": 81,
        "centerX": 396.17,
        "centerY": 731.5,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 85.33,
        "fontSizePt": 85.33,
        "lineHeight": 92.14,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_672x560|banner1": {
    "sourceFile": "Appier_banner1_672x560_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 263,
        "y": 37,
        "width": 147,
        "height": 33,
        "centerX": 336.5,
        "centerY": 53.5,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 153,
        "y": 81,
        "width": 366,
        "height": 51,
        "centerX": 336,
        "centerY": 106.5,
        "hidden": false
      },
      "副標題": {
        "x": 226,
        "y": 156,
        "width": 221,
        "height": 32,
        "centerX": 336.5,
        "centerY": 172,
        "hidden": true,
        "fontSizePx": 33.42,
        "fontSizePt": 33.42,
        "lineHeight": 40.1,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 164.5,
        "y": 148,
        "width": 111,
        "height": 39,
        "centerX": 220,
        "centerY": 167.5,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 280.5,
        "y": 160,
        "width": 227,
        "height": 27,
        "centerX": 394,
        "centerY": 173.5,
        "hidden": false,
        "fontSizePx": 27.19,
        "fontSizePt": 27.19,
        "lineHeight": 32.63,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 153,
        "y": 141,
        "width": 366,
        "height": 62,
        "centerX": 336,
        "centerY": 172,
        "hidden": false
      },
      "警語": {
        "x": 248,
        "y": 207,
        "width": 175,
        "height": 15,
        "centerX": 335.5,
        "centerY": 214.5,
        "hidden": false,
        "fontSizePx": 16,
        "fontSizePt": 16,
        "lineHeight": 19.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 166,
        "y": 232,
        "width": 341,
        "height": 301,
        "centerX": 336.5,
        "centerY": 382.5
      },
      "P": {
        "x": 68,
        "y": 233,
        "width": 539,
        "height": 292,
        "centerX": 337.5,
        "centerY": 379,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 301,
        "y": 301,
        "width": 214,
        "height": 212,
        "centerX": 408,
        "centerY": 407,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 77,
        "y": 228,
        "width": 338,
        "height": 264,
        "centerX": 246,
        "centerY": 360,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 481,
        "y": 218,
        "width": 100,
        "height": 83,
        "centerX": 531,
        "centerY": 259.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 91,
        "y": 215,
        "width": 195,
        "height": 133,
        "centerX": 188.5,
        "centerY": 281.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 672,
        "height": 560,
        "centerX": 336,
        "centerY": 280,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 241.67,
        "y": 372.11,
        "width": 334,
        "height": 75,
        "centerX": 408.67,
        "centerY": 409.61,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 80.26,
        "fontSizePt": 80.26,
        "lineHeight": 86.68,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_960x640|banner1": {
    "sourceFile": "Appier_banner1_960x640_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 393,
        "y": 28,
        "width": 176,
        "height": 41,
        "centerX": 481,
        "centerY": 48.5,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 264,
        "y": 80,
        "width": 433,
        "height": 60,
        "centerX": 480.5,
        "centerY": 110,
        "hidden": false
      },
      "副標題": {
        "x": 351,
        "y": 170,
        "width": 259,
        "height": 37,
        "centerX": 480.5,
        "centerY": 188.5,
        "hidden": true,
        "fontSizePx": 39.12,
        "fontSizePt": 39.12,
        "lineHeight": 46.94,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 279.5,
        "y": 161,
        "width": 130,
        "height": 46,
        "centerX": 344.5,
        "centerY": 184,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 414.5,
        "y": 175,
        "width": 266,
        "height": 31,
        "centerX": 547.5,
        "centerY": 190.5,
        "hidden": false,
        "fontSizePx": 31.82,
        "fontSizePt": 31.82,
        "lineHeight": 38.18,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 263.5,
        "y": 152,
        "width": 433,
        "height": 73,
        "centerX": 480,
        "centerY": 188.5,
        "hidden": false
      },
      "警語": {
        "x": 377,
        "y": 229,
        "width": 208,
        "height": 18,
        "centerX": 481,
        "centerY": 238,
        "hidden": false,
        "fontSizePx": 19,
        "fontSizePt": 19,
        "lineHeight": 22.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 271,
        "y": 228,
        "width": 419,
        "height": 370,
        "centerX": 480.5,
        "centerY": 413
      },
      "P": {
        "x": 139,
        "y": 240,
        "width": 684,
        "height": 370,
        "centerX": 481,
        "centerY": 425,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 450,
        "y": 319,
        "width": 270,
        "height": 269,
        "centerX": 585,
        "centerY": 453.5,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 167,
        "y": 228,
        "width": 427,
        "height": 333,
        "centerX": 380.5,
        "centerY": 394.5,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 687,
        "y": 248,
        "width": 121,
        "height": 101,
        "centerX": 747.5,
        "centerY": 298.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 189,
        "y": 243,
        "width": 219,
        "height": 149,
        "centerX": 298.5,
        "centerY": 317.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 960,
        "height": 640,
        "centerX": 480,
        "centerY": 320,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 359.82,
        "y": 415.81,
        "width": 423,
        "height": 96,
        "centerX": 571.32,
        "centerY": 463.81,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 101.87,
        "fontSizePt": 101.87,
        "lineHeight": 110.01,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_970x250|banner1": {
    "sourceFile": "Appier_banner1_970x250_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 206,
        "y": 24,
        "width": 163,
        "height": 37,
        "centerX": 287.5,
        "centerY": 42.5,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 95,
        "y": 67,
        "width": 384,
        "height": 53,
        "centerX": 287,
        "centerY": 93.5,
        "hidden": false
      },
      "副標題": {
        "x": 171,
        "y": 144,
        "width": 233,
        "height": 34,
        "centerX": 287.5,
        "centerY": 161,
        "hidden": true,
        "fontSizePx": 35.5,
        "fontSizePt": 35.5,
        "lineHeight": 42.6,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 105,
        "y": 136,
        "width": 118,
        "height": 42,
        "centerX": 164,
        "centerY": 157,
        "hidden": false
      },
      "蝦皮VIP_副標題": {
        "x": 228,
        "y": 149,
        "width": 241,
        "height": 28,
        "centerX": 348.5,
        "centerY": 163,
        "hidden": false,
        "fontSizePx": 28.87,
        "fontSizePt": 28.87,
        "lineHeight": 34.64,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 95,
        "y": 128,
        "width": 384,
        "height": 65,
        "centerX": 287,
        "centerY": 160.5,
        "hidden": false
      },
      "警語": {
        "x": 197,
        "y": 198,
        "width": 180,
        "height": 16,
        "centerX": 287,
        "centerY": 206,
        "hidden": false,
        "fontSizePx": 16.5,
        "fontSizePt": 16.5,
        "lineHeight": 19.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 562.8,
        "y": -7.2,
        "width": 289.4,
        "height": 254.4,
        "centerX": 707.5,
        "centerY": 120
      },
      "P": {
        "x": 522.53,
        "y": 12.94,
        "width": 352.98,
        "height": 190.8,
        "centerX": 699.02,
        "centerY": 108.34,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 704.85,
        "y": 61.7,
        "width": 146.28,
        "height": 144.16,
        "centerX": 777.99,
        "centerY": 133.78,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 550.09,
        "y": -2.96,
        "width": 228.96,
        "height": 178.08,
        "centerX": 664.57,
        "centerY": 86.08,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 827.1,
        "y": 19.2,
        "width": 85,
        "height": 60,
        "centerX": 869.6,
        "centerY": 49.2,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 515,
        "y": 25,
        "width": 122,
        "height": 84,
        "centerX": 576,
        "centerY": 67,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 970,
        "height": 250,
        "centerX": 485,
        "centerY": 125,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 636.14,
        "y": 103.36,
        "width": 219,
        "height": 50,
        "centerX": 745.64,
        "centerY": 128.36,
        "rotation": 4.04,
        "hidden": false,
        "locked": false,
        "fontSizePx": 52.57,
        "fontSizePt": 52.57,
        "lineHeight": 56.76,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_1200x627|banner2": {
    "sourceFile": "Appier_banner2_1200x627_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 122,
        "y": 65,
        "width": 335,
        "height": 354,
        "centerX": 289.5,
        "centerY": 242,
        "hidden": false
      },
      "副標題": {
        "x": 139.5,
        "y": 461,
        "width": 298,
        "height": 43,
        "centerX": 288.5,
        "centerY": 482.5,
        "hidden": false,
        "fontSizePx": 44.81,
        "fontSizePt": 44.81,
        "lineHeight": 53.77,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 61,
        "y": 451,
        "width": 149,
        "height": 52,
        "centerX": 135.5,
        "centerY": 477,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 214,
        "y": 467,
        "width": 302,
        "height": 35,
        "centerX": 365,
        "centerY": 484.5,
        "hidden": true,
        "fontSizePx": 36.44,
        "fontSizePt": 36.44,
        "lineHeight": 43.73,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 121,
        "y": 441,
        "width": 335,
        "height": 82,
        "centerX": 288.5,
        "centerY": 482,
        "hidden": false
      },
      "警語": {
        "x": 174,
        "y": 529,
        "width": 230,
        "height": 20,
        "centerX": 289,
        "centerY": 539,
        "hidden": false,
        "fontSizePx": 21,
        "fontSizePt": 21,
        "lineHeight": 25.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 584,
        "y": 35,
        "width": 606,
        "height": 533,
        "centerX": 887,
        "centerY": 301.5
      },
      "P": {
        "x": 587,
        "y": 189,
        "width": 600,
        "height": 325,
        "centerX": 887,
        "centerY": 351.5,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 868.56,
        "y": 183.3,
        "width": 278.57,
        "height": 379.88,
        "centerX": 1007.84,
        "centerY": 373.24,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 692.94,
        "y": 37.3,
        "width": 180.46,
        "height": 475.52,
        "centerX": 783.17,
        "centerY": 275.06,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1037,
        "y": 55,
        "width": 151,
        "height": 126,
        "centerX": 1112.5,
        "centerY": 118,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 534,
        "y": 148.6,
        "width": 276,
        "height": 217.8,
        "centerX": 672,
        "centerY": 257.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1200,
        "height": 627,
        "centerX": 600,
        "centerY": 313.5,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_1536x2048|banner2": {
    "sourceFile": "Appier_banner2_1536x2048_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 432,
        "y": 105,
        "width": 674,
        "height": 713,
        "centerX": 769,
        "centerY": 461.5,
        "hidden": false
      },
      "副標題": {
        "x": 492.5,
        "y": 878,
        "width": 551,
        "height": 79,
        "centerX": 768,
        "centerY": 917.5,
        "hidden": false,
        "fontSizePx": 82.88,
        "fontSizePt": 82.88,
        "lineHeight": 99.46,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 347,
        "y": 859,
        "width": 276,
        "height": 97,
        "centerX": 485,
        "centerY": 907.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 630,
        "y": 890,
        "width": 559,
        "height": 64,
        "centerX": 909.5,
        "centerY": 922,
        "hidden": true,
        "fontSizePx": 67.42,
        "fontSizePt": 67.42,
        "lineHeight": 80.9,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 431,
        "y": 841,
        "width": 674,
        "height": 152,
        "centerX": 768,
        "centerY": 917,
        "hidden": false
      },
      "警語": {
        "x": 555,
        "y": 1004,
        "width": 425,
        "height": 37,
        "centerX": 767.5,
        "centerY": 1022.5,
        "hidden": false,
        "fontSizePx": 39,
        "fontSizePt": 39,
        "lineHeight": 46.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 288.8,
        "y": 1086.4,
        "width": 960.4,
        "height": 845.3,
        "centerX": 769,
        "centerY": 1509.1
      },
      "P": {
        "x": 123.7,
        "y": 1159.98,
        "width": 1289.65,
        "height": 698.13,
        "centerX": 768.53,
        "centerY": 1509.05,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 716.32,
        "y": 1257.98,
        "width": 479.43,
        "height": 653.6,
        "centerX": 956.03,
        "centerY": 1584.78,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 413.76,
        "y": 1065.82,
        "width": 318.43,
        "height": 841.59,
        "centerX": 572.97,
        "centerY": 1486.62,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1125,
        "y": 1066,
        "width": 265,
        "height": 220,
        "centerX": 1257.5,
        "centerY": 1176,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 134.3,
        "y": 1152.3,
        "width": 538,
        "height": 424.6,
        "centerX": 403.3,
        "centerY": 1364.6,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1536,
        "height": 2048,
        "centerX": 768,
        "centerY": 1024,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_160x600|banner2": {
    "sourceFile": "Appier_banner2_160x600_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 16,
        "y": 102,
        "width": 128,
        "height": 136,
        "centerX": 80,
        "centerY": 170,
        "hidden": false
      },
      "副標題_上": {
        "x": 18,
        "y": 255,
        "width": 124,
        "height": 29,
        "centerX": 80,
        "centerY": 269.5,
        "hidden": false,
        "fontSizePx": 30.11,
        "fontSizePt": 30.11,
        "lineHeight": 36.13,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_下": {
        "x": 17,
        "y": 294,
        "width": 126,
        "height": 56,
        "centerX": 80,
        "centerY": 322,
        "hidden": true,
        "fontSizePx": 62.42,
        "fontSizePt": 62.42,
        "lineHeight": 74.9,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "警語": {
        "x": 14,
        "y": 363,
        "width": 131,
        "height": 12,
        "centerX": 79.5,
        "centerY": 369,
        "hidden": false,
        "fontSizePx": 12.38,
        "fontSizePt": 12.38,
        "lineHeight": 14.86,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P": {
        "x": 3,
        "y": 403,
        "width": 155,
        "height": 83,
        "centerX": 80.5,
        "centerY": 444.5,
        "rotation": 0
      },
      "P_範圍": {
        "x": 2,
        "y": 376,
        "width": 157,
        "height": 139,
        "centerX": 80.5,
        "centerY": 445.5
      },
      "P_01": {
        "x": 79.57,
        "y": 415,
        "width": 70.31,
        "height": 96.19,
        "centerX": 114.725,
        "centerY": 463.095,
        "rotation": 0
      },
      "P_02": {
        "x": 39.21,
        "y": 386.75,
        "width": 46.79,
        "height": 122.96,
        "centerX": 62.605,
        "centerY": 448.23,
        "rotation": 0
      },
      "DECO_錢幣_右上": {
        "x": 93,
        "y": 535,
        "width": 63,
        "height": 52,
        "centerX": 124.5,
        "centerY": 561,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 9,
        "y": 10,
        "width": 131,
        "height": 89,
        "centerX": 74.5,
        "centerY": 54.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 160,
        "height": 600,
        "centerX": 80,
        "centerY": 300,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_2048x1536|banner2": {
    "sourceFile": "Appier_banner2_2048x1536_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 810,
        "y": 71,
        "width": 429,
        "height": 96,
        "centerX": 1024.5,
        "centerY": 119,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 497,
        "y": 197,
        "width": 1054,
        "height": 146,
        "centerX": 1024,
        "centerY": 270,
        "hidden": false
      },
      "副標題": {
        "x": 701,
        "y": 416,
        "width": 646,
        "height": 92,
        "centerX": 1024,
        "centerY": 462,
        "hidden": false,
        "fontSizePx": 97.25,
        "fontSizePt": 97.25,
        "lineHeight": 116.7,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 497,
        "y": 372,
        "width": 1054,
        "height": 178,
        "centerX": 1024,
        "centerY": 461,
        "hidden": false
      },
      "警語": {
        "x": 779,
        "y": 562,
        "width": 490,
        "height": 42,
        "centerX": 1024,
        "centerY": 583,
        "hidden": false,
        "fontSizePx": 45,
        "fontSizePt": 45,
        "lineHeight": 54,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 581.8,
        "y": 624.2,
        "width": 886.4,
        "height": 779.6,
        "centerX": 1025,
        "centerY": 1014
      },
      "P_01": {
        "x": 1018.78,
        "y": 746.48,
        "width": 471.28,
        "height": 640.41,
        "centerX": 1254.42,
        "centerY": 1066.68,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 658.52,
        "y": 619.04,
        "width": 309.97,
        "height": 819.59,
        "centerX": 813.5,
        "centerY": 1028.84,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1466.6,
        "y": 652,
        "width": 262,
        "height": 185,
        "centerX": 1597.6,
        "centerY": 744.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 269.1,
        "y": 658.1,
        "width": 472,
        "height": 372.5,
        "centerX": 505.1,
        "centerY": 844.4,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 2048,
        "height": 1536,
        "centerX": 1024,
        "centerY": 768,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_300x600|banner2": {
    "sourceFile": "Appier_banner2_300x600_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 47,
        "y": 52,
        "width": 206,
        "height": 218,
        "centerX": 150,
        "centerY": 161,
        "hidden": false
      },
      "副標題": {
        "x": 77,
        "y": 290,
        "width": 146,
        "height": 21,
        "centerX": 150,
        "centerY": 300.5,
        "hidden": false,
        "fontSizePx": 21.91,
        "fontSizePt": 21.91,
        "lineHeight": 26.29,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 39,
        "y": 285,
        "width": 73,
        "height": 26,
        "centerX": 75.5,
        "centerY": 298,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 114,
        "y": 293,
        "width": 148,
        "height": 17,
        "centerX": 188,
        "centerY": 301.5,
        "hidden": true,
        "fontSizePx": 17.82,
        "fontSizePt": 17.82,
        "lineHeight": 21.38,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 47,
        "y": 280,
        "width": 206,
        "height": 41,
        "centerX": 150,
        "centerY": 300.5,
        "hidden": false
      },
      "警語": {
        "x": 95,
        "y": 323,
        "width": 110,
        "height": 10,
        "centerX": 150,
        "centerY": 328,
        "hidden": false,
        "fontSizePx": 10,
        "fontSizePt": 10,
        "lineHeight": 12,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 17,
        "y": 338,
        "width": 267,
        "height": 235,
        "centerX": 150.5,
        "centerY": 455.5
      },
      "P": {
        "x": 8,
        "y": 378,
        "width": 286,
        "height": 155,
        "centerX": 151,
        "centerY": 455.5,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 155.92,
        "y": 390.3,
        "width": 121.04,
        "height": 164.37,
        "centerX": 216.44,
        "centerY": 472.49,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 80.53,
        "y": 343.05,
        "width": 79.09,
        "height": 207.02,
        "centerX": 120.08,
        "centerY": 446.56,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": -4.1,
        "y": 369,
        "width": 80,
        "height": 56.5,
        "centerX": 35.9,
        "centerY": 397.3,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 237.5,
        "y": 349,
        "width": 84,
        "height": 66.3,
        "centerX": 279.5,
        "centerY": 382.1,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 300,
        "height": 600,
        "centerX": 150,
        "centerY": 300,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_320x480|banner2": {
    "sourceFile": "Appier_banner2_320x480_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 84,
        "y": 33,
        "width": 153,
        "height": 161,
        "centerX": 160.5,
        "centerY": 113.5,
        "hidden": false
      },
      "副標題": {
        "x": 98,
        "y": 209,
        "width": 123,
        "height": 18,
        "centerX": 159.5,
        "centerY": 218,
        "hidden": false,
        "fontSizePx": 18.49,
        "fontSizePt": 18.49,
        "lineHeight": 22.19,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 66,
        "y": 205,
        "width": 62,
        "height": 22,
        "centerX": 97,
        "centerY": 216,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 129,
        "y": 211,
        "width": 125,
        "height": 15,
        "centerX": 191.5,
        "centerY": 218.5,
        "hidden": true,
        "fontSizePx": 15.04,
        "fontSizePt": 15.04,
        "lineHeight": 18.05,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 83,
        "y": 200,
        "width": 153,
        "height": 35,
        "centerX": 159.5,
        "centerY": 217.5,
        "hidden": false
      },
      "警語": {
        "x": 110,
        "y": 237,
        "width": 101,
        "height": 9,
        "centerX": 160.5,
        "centerY": 241.5,
        "hidden": false,
        "fontSizePx": 9.13,
        "fontSizePt": 9.13,
        "lineHeight": 10.96,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 38,
        "y": 253,
        "width": 244,
        "height": 215,
        "centerX": 160,
        "centerY": 360.5
      },
      "P_01": {
        "x": 166.85,
        "y": 301.52,
        "width": 111.25,
        "height": 149.76,
        "centerX": 222.48,
        "centerY": 376.41,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 95.08,
        "y": 256.4,
        "width": 74.26,
        "height": 193.22,
        "centerX": 132.21,
        "centerY": 353.01,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 243,
        "y": 249,
        "width": 62,
        "height": 52,
        "centerX": 274,
        "centerY": 275,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 19,
        "y": 240,
        "width": 120,
        "height": 75,
        "centerX": 79,
        "centerY": 277.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 480,
        "centerX": 160,
        "centerY": 240,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_336x280|banner2": {
    "sourceFile": "Appier_banner2_336x280_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 125,
        "y": 9,
        "width": 87,
        "height": 20,
        "centerX": 168.5,
        "centerY": 19,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 60,
        "y": 34,
        "width": 216,
        "height": 30,
        "centerX": 168,
        "centerY": 49,
        "hidden": false
      },
      "副標題": {
        "x": 103,
        "y": 79,
        "width": 131,
        "height": 20,
        "centerX": 168.5,
        "centerY": 89,
        "hidden": false,
        "fontSizePx": 19.66,
        "fontSizePt": 19.66,
        "lineHeight": 23.59,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 68,
        "y": 75,
        "width": 65,
        "height": 23,
        "centerX": 100.5,
        "centerY": 86.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 135,
        "y": 82,
        "width": 133,
        "height": 16,
        "centerX": 201.5,
        "centerY": 90,
        "hidden": true,
        "fontSizePx": 16,
        "fontSizePt": 16,
        "lineHeight": 19.2,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 60.5,
        "y": 71,
        "width": 216,
        "height": 36,
        "centerX": 168.5,
        "centerY": 89,
        "hidden": false
      },
      "警語": {
        "x": 118,
        "y": 110,
        "width": 99,
        "height": 9,
        "centerX": 167.5,
        "centerY": 114.5,
        "hidden": false,
        "fontSizePx": 9,
        "fontSizePt": 9,
        "lineHeight": 10.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 91.5,
        "y": 126.2,
        "width": 153.1,
        "height": 133.5,
        "centerX": 168.1,
        "centerY": 192.9
      },
      "P": {
        "x": 55.02,
        "y": 127.09,
        "width": 226.95,
        "height": 121.93,
        "centerX": 168.49,
        "centerY": 188.05,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 171.49,
        "y": 147.53,
        "width": 77.63,
        "height": 106.2,
        "centerX": 210.3,
        "centerY": 200.63,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 106.9,
        "y": 126.04,
        "width": 51.56,
        "height": 136.24,
        "centerX": 132.68,
        "centerY": 194.16,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 268,
        "y": 119,
        "width": 49,
        "height": 41,
        "centerX": 292.5,
        "centerY": 139.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 48,
        "y": 121,
        "width": 85,
        "height": 58,
        "centerX": 90.5,
        "centerY": 150,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 336,
        "height": 280,
        "centerX": 168,
        "centerY": 140,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_480x320|banner2": {
    "sourceFile": "Appier_banner2_480x320_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 186,
        "y": 9,
        "width": 109,
        "height": 26,
        "centerX": 240.5,
        "centerY": 22,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 107,
        "y": 41,
        "width": 266,
        "height": 37,
        "centerX": 240,
        "centerY": 59.5,
        "hidden": false
      },
      "副標題": {
        "x": 158.5,
        "y": 96,
        "width": 164,
        "height": 24,
        "centerX": 240.5,
        "centerY": 108,
        "hidden": false,
        "fontSizePx": 24.59,
        "fontSizePt": 24.59,
        "lineHeight": 29.51,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 115,
        "y": 90,
        "width": 82,
        "height": 29,
        "centerX": 156,
        "centerY": 104.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 199,
        "y": 99,
        "width": 166,
        "height": 20,
        "centerX": 282,
        "centerY": 109,
        "hidden": true,
        "fontSizePx": 20,
        "fontSizePt": 20,
        "lineHeight": 24,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 107.5,
        "y": 85,
        "width": 266,
        "height": 45,
        "centerX": 240.5,
        "centerY": 107.5,
        "hidden": false
      },
      "警語": {
        "x": 179,
        "y": 133,
        "width": 123,
        "height": 11,
        "centerX": 240.5,
        "centerY": 138.5,
        "hidden": false,
        "fontSizePx": 11.2,
        "fontSizePt": 11.2,
        "lineHeight": 13.44,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 168.1,
        "y": 151.8,
        "width": 145.8,
        "height": 127.5,
        "centerX": 241,
        "centerY": 215.6
      },
      "P": {
        "x": 130.93,
        "y": 152.6,
        "width": 219.35,
        "height": 118.79,
        "centerX": 240.6,
        "centerY": 211.99,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 245.66,
        "y": 167.41,
        "width": 78.94,
        "height": 106.06,
        "centerX": 285.13,
        "centerY": 220.44,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 174.44,
        "y": 148.35,
        "width": 56.16,
        "height": 147.05,
        "centerX": 202.52,
        "centerY": 221.87,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 353,
        "y": 137,
        "width": 68,
        "height": 56,
        "centerX": 387,
        "centerY": 165,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 83,
        "y": 155,
        "width": 101,
        "height": 61,
        "centerX": 133.5,
        "centerY": 185.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 480,
        "height": 320,
        "centerX": 240,
        "centerY": 160,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_600x1200|banner2": {
    "sourceFile": "Appier_banner2_600x1200_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 123,
        "y": 136,
        "width": 354,
        "height": 375,
        "centerX": 300,
        "centerY": 323.5,
        "hidden": false
      },
      "副標題": {
        "x": 157,
        "y": 543,
        "width": 286,
        "height": 41,
        "centerX": 300,
        "centerY": 563.5,
        "hidden": false,
        "fontSizePx": 43,
        "fontSizePt": 43,
        "lineHeight": 51.6,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 81,
        "y": 533,
        "width": 143,
        "height": 50,
        "centerX": 152.5,
        "centerY": 558,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 228,
        "y": 549,
        "width": 291,
        "height": 34,
        "centerX": 373.5,
        "centerY": 566,
        "hidden": true,
        "fontSizePx": 35,
        "fontSizePt": 35,
        "lineHeight": 42,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 123,
        "y": 523,
        "width": 354,
        "height": 80,
        "centerX": 300,
        "centerY": 563,
        "hidden": false
      },
      "警語": {
        "x": 185,
        "y": 608,
        "width": 230,
        "height": 20,
        "centerX": 300,
        "centerY": 618,
        "hidden": false,
        "fontSizePx": 21,
        "fontSizePt": 21,
        "lineHeight": 25.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 20.1,
        "y": 627,
        "width": 561.8,
        "height": 492.2,
        "centerX": 301,
        "centerY": 873.1
      },
      "P": {
        "x": -20.39,
        "y": 710.16,
        "width": 641.66,
        "height": 348.36,
        "centerX": 300.44,
        "centerY": 884.34,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 299.75,
        "y": 759.37,
        "width": 268.03,
        "height": 365.32,
        "centerX": 433.76,
        "centerY": 942.03,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 131.28,
        "y": 646.17,
        "width": 180.26,
        "height": 473.73,
        "centerX": 221.41,
        "centerY": 883.03,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 480,
        "y": 673,
        "width": 82,
        "height": 69,
        "centerX": 521,
        "centerY": 707.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 17.8,
        "y": 687.1,
        "width": 220,
        "height": 173.6,
        "centerX": 127.8,
        "centerY": 773.9,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 600,
        "height": 1200,
        "centerX": 300,
        "centerY": 600,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_600x500|banner2": {
    "sourceFile": "Appier_banner2_600x500_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 236,
        "y": 31,
        "width": 133,
        "height": 30,
        "centerX": 302.5,
        "centerY": 46,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 136,
        "y": 71,
        "width": 330,
        "height": 46,
        "centerX": 301,
        "centerY": 94,
        "hidden": false
      },
      "副標題": {
        "x": 201.5,
        "y": 138,
        "width": 198,
        "height": 29,
        "centerX": 300.5,
        "centerY": 152.5,
        "hidden": false,
        "fontSizePx": 29.76,
        "fontSizePt": 29.76,
        "lineHeight": 35.71,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 149,
        "y": 131,
        "width": 99,
        "height": 35,
        "centerX": 198.5,
        "centerY": 148.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 250,
        "y": 142,
        "width": 202,
        "height": 24,
        "centerX": 351,
        "centerY": 154,
        "hidden": true,
        "fontSizePx": 24.22,
        "fontSizePt": 24.22,
        "lineHeight": 29.06,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 135.5,
        "y": 125,
        "width": 330,
        "height": 55,
        "centerX": 300.5,
        "centerY": 152.5,
        "hidden": false
      },
      "警語": {
        "x": 221,
        "y": 183,
        "width": 159,
        "height": 14,
        "centerX": 300.5,
        "centerY": 190,
        "hidden": false,
        "fontSizePx": 14.5,
        "fontSizePt": 14.5,
        "lineHeight": 17.4,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 174.3,
        "y": 213.1,
        "width": 278.6,
        "height": 244.7,
        "centerX": 313.6,
        "centerY": 335.4
      },
      "P": {
        "x": 111.17,
        "y": 225.56,
        "width": 403.09,
        "height": 218.9,
        "centerX": 312.71,
        "centerY": 335.01,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 297.72,
        "y": 253.08,
        "width": 148.09,
        "height": 201.51,
        "centerX": 371.77,
        "centerY": 353.84,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 182.07,
        "y": 211.97,
        "width": 98.13,
        "height": 257.9,
        "centerX": 231.13,
        "centerY": 340.92,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 428,
        "y": 204,
        "width": 79,
        "height": 66,
        "centerX": 467.5,
        "centerY": 237,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 84,
        "y": 200,
        "width": 155,
        "height": 106,
        "centerX": 161.5,
        "centerY": 253,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 600,
        "height": 500,
        "centerX": 300,
        "centerY": 250,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_640x200|banner2": {
    "sourceFile": "Appier_banner2_640x200_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 116,
        "y": 29,
        "width": 107,
        "height": 25,
        "centerX": 169.5,
        "centerY": 41.5,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 41,
        "y": 59,
        "width": 258,
        "height": 36,
        "centerX": 170,
        "centerY": 77,
        "hidden": false
      },
      "副標題": {
        "x": 89.5,
        "y": 115,
        "width": 160,
        "height": 23,
        "centerX": 169.5,
        "centerY": 126.5,
        "hidden": false,
        "fontSizePx": 24.05,
        "fontSizePt": 24.05,
        "lineHeight": 28.86,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 48,
        "y": 109,
        "width": 80,
        "height": 28,
        "centerX": 88,
        "centerY": 123,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 130,
        "y": 118,
        "width": 162,
        "height": 19,
        "centerX": 211,
        "centerY": 127.5,
        "hidden": true,
        "fontSizePx": 19.56,
        "fontSizePt": 19.56,
        "lineHeight": 23.47,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 40.5,
        "y": 104,
        "width": 258,
        "height": 44,
        "centerX": 169.5,
        "centerY": 126,
        "hidden": false
      },
      "警語": {
        "x": 110,
        "y": 151,
        "width": 120,
        "height": 11,
        "centerX": 170,
        "centerY": 156.5,
        "hidden": false,
        "fontSizePx": 11,
        "fontSizePt": 11,
        "lineHeight": 13.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 363,
        "y": 5.5,
        "width": 194.1,
        "height": 170,
        "centerX": 460.1,
        "centerY": 90.5
      },
      "P": {
        "x": 339.01,
        "y": 26.86,
        "width": 230.52,
        "height": 124.6,
        "centerX": 454.27,
        "centerY": 89.16,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 469.46,
        "y": 40.67,
        "width": 88.72,
        "height": 122.46,
        "centerX": 513.82,
        "centerY": 101.9,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 387.29,
        "y": 5.79,
        "width": 64.45,
        "height": 168.62,
        "centerX": 419.52,
        "centerY": 90.1,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 559,
        "y": 11,
        "width": 61,
        "height": 46,
        "centerX": 589.5,
        "centerY": 34,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 315,
        "y": 13,
        "width": 92,
        "height": 58,
        "centerX": 361,
        "centerY": 42,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 640,
        "height": 200,
        "centerX": 320,
        "centerY": 100,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_640x960|banner2": {
    "sourceFile": "Appier_banner2_640x960_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 154,
        "y": 63,
        "width": 333,
        "height": 351,
        "centerX": 320.5,
        "centerY": 238.5,
        "hidden": false
      },
      "副標題": {
        "x": 184.5,
        "y": 444,
        "width": 270,
        "height": 39,
        "centerX": 319.5,
        "centerY": 463.5,
        "hidden": false,
        "fontSizePx": 40.57,
        "fontSizePt": 40.57,
        "lineHeight": 48.68,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 114,
        "y": 435,
        "width": 135,
        "height": 47,
        "centerX": 181.5,
        "centerY": 458.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 253,
        "y": 450,
        "width": 274,
        "height": 32,
        "centerX": 390,
        "centerY": 466,
        "hidden": true,
        "fontSizePx": 33,
        "fontSizePt": 33,
        "lineHeight": 39.6,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 153,
        "y": 426,
        "width": 333,
        "height": 75,
        "centerX": 319.5,
        "centerY": 463.5,
        "hidden": false
      },
      "警語": {
        "x": 217,
        "y": 506,
        "width": 207,
        "height": 18,
        "centerX": 320.5,
        "centerY": 515,
        "hidden": false,
        "fontSizePx": 19,
        "fontSizePt": 19,
        "lineHeight": 22.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 104,
        "y": 544,
        "width": 431,
        "height": 380,
        "centerX": 319.5,
        "centerY": 734
      },
      "P": {
        "x": 34,
        "y": 544,
        "width": 573,
        "height": 310,
        "centerX": 320.5,
        "centerY": 699,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 319,
        "y": 634.6,
        "width": 213.6,
        "height": 291,
        "centerX": 425.8,
        "centerY": 780.1,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 149.7,
        "y": 544.7,
        "width": 143.7,
        "height": 376.4,
        "centerX": 221.5,
        "centerY": 732.9,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 490,
        "y": 559,
        "width": 121,
        "height": 101,
        "centerX": 550.5,
        "centerY": 609.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 12.7,
        "y": 589.4,
        "width": 220,
        "height": 173.6,
        "centerX": 122.7,
        "centerY": 676.2,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 640,
        "height": 960,
        "centerX": 320,
        "centerY": 480,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_672x560|banner2": {
    "sourceFile": "Appier_banner2_672x560_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 263,
        "y": 37,
        "width": 147,
        "height": 33,
        "centerX": 336.5,
        "centerY": 53.5,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 153,
        "y": 81,
        "width": 366,
        "height": 51,
        "centerX": 336,
        "centerY": 106.5,
        "hidden": false
      },
      "副標題": {
        "x": 225,
        "y": 156,
        "width": 222,
        "height": 32,
        "centerX": 336,
        "centerY": 172,
        "hidden": false,
        "fontSizePx": 33.42,
        "fontSizePt": 33.42,
        "lineHeight": 40.1,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 166,
        "y": 148,
        "width": 111,
        "height": 39,
        "centerX": 221.5,
        "centerY": 167.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 280,
        "y": 160,
        "width": 226,
        "height": 27,
        "centerX": 393,
        "centerY": 173.5,
        "hidden": true,
        "fontSizePx": 27.19,
        "fontSizePt": 27.19,
        "lineHeight": 32.63,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 153,
        "y": 141,
        "width": 366,
        "height": 62,
        "centerX": 336,
        "centerY": 172,
        "hidden": false
      },
      "警語": {
        "x": 248,
        "y": 207,
        "width": 175,
        "height": 15,
        "centerX": 335.5,
        "centerY": 214.5,
        "hidden": false,
        "fontSizePx": 16,
        "fontSizePt": 16,
        "lineHeight": 19.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 202.4,
        "y": 244.1,
        "width": 286.3,
        "height": 252.7,
        "centerX": 345.6,
        "centerY": 370.4
      },
      "P": {
        "x": 120.14,
        "y": 244.95,
        "width": 452.51,
        "height": 245.14,
        "centerX": 346.39,
        "centerY": 367.52,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 331.49,
        "y": 283.72,
        "width": 159.89,
        "height": 216.71,
        "centerX": 411.43,
        "centerY": 392.08,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 208.9,
        "y": 238.4,
        "width": 105.37,
        "height": 278.07,
        "centerX": 261.59,
        "centerY": 377.43,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 481,
        "y": 218,
        "width": 100,
        "height": 83,
        "centerX": 531,
        "centerY": 259.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 91,
        "y": 215,
        "width": 195,
        "height": 133,
        "centerX": 188.5,
        "centerY": 281.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 672,
        "height": 560,
        "centerX": 336,
        "centerY": 280,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_960x640|banner2": {
    "sourceFile": "Appier_banner2_960x640_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 393,
        "y": 28,
        "width": 176,
        "height": 41,
        "centerX": 481,
        "centerY": 48.5,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 264,
        "y": 80,
        "width": 433,
        "height": 60,
        "centerX": 480.5,
        "centerY": 110,
        "hidden": false
      },
      "副標題": {
        "x": 350,
        "y": 170,
        "width": 260,
        "height": 37,
        "centerX": 480,
        "centerY": 188.5,
        "hidden": false,
        "fontSizePx": 39.12,
        "fontSizePt": 39.12,
        "lineHeight": 46.94,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 281,
        "y": 161,
        "width": 130,
        "height": 46,
        "centerX": 346,
        "centerY": 184,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 415,
        "y": 175,
        "width": 264,
        "height": 31,
        "centerX": 547,
        "centerY": 190.5,
        "hidden": true,
        "fontSizePx": 31.82,
        "fontSizePt": 31.82,
        "lineHeight": 38.18,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 263.5,
        "y": 152,
        "width": 433,
        "height": 73,
        "centerX": 480,
        "centerY": 188.5,
        "hidden": false
      },
      "警語": {
        "x": 377,
        "y": 229,
        "width": 208,
        "height": 18,
        "centerX": 481,
        "centerY": 238,
        "hidden": false,
        "fontSizePx": 19,
        "fontSizePt": 19,
        "lineHeight": 22.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 302.1,
        "y": 268.7,
        "width": 372.9,
        "height": 329.3,
        "centerX": 488.6,
        "centerY": 433.4
      },
      "P": {
        "x": 184.61,
        "y": 279.38,
        "width": 608.76,
        "height": 329.3,
        "centerX": 488.99,
        "centerY": 444.03,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 482.24,
        "y": 325.03,
        "width": 213.87,
        "height": 291.5,
        "centerX": 589.18,
        "centerY": 470.78,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 318.61,
        "y": 264.68,
        "width": 141.11,
        "height": 371.84,
        "centerX": 389.16,
        "centerY": 450.6,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 675,
        "y": 266.4,
        "width": 121,
        "height": 85.4,
        "centerX": 735.5,
        "centerY": 309.1,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 161,
        "y": 259,
        "width": 219,
        "height": 172.8,
        "centerX": 270.5,
        "centerY": 345.4,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 960,
        "height": 640,
        "centerX": 480,
        "centerY": 320,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_970x250|banner2": {
    "sourceFile": "Appier_banner2_970x250_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 206,
        "y": 24,
        "width": 163,
        "height": 37,
        "centerX": 287.5,
        "centerY": 42.5,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 95,
        "y": 67,
        "width": 384,
        "height": 53,
        "centerX": 287,
        "centerY": 93.5,
        "hidden": false
      },
      "副標題": {
        "x": 169,
        "y": 144,
        "width": 236,
        "height": 34,
        "centerX": 287,
        "centerY": 161,
        "hidden": false,
        "fontSizePx": 35.5,
        "fontSizePt": 35.5,
        "lineHeight": 42.6,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 107,
        "y": 136,
        "width": 118,
        "height": 42,
        "centerX": 166,
        "centerY": 157,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 228,
        "y": 149,
        "width": 239,
        "height": 28,
        "centerX": 347.5,
        "centerY": 163,
        "hidden": true,
        "fontSizePx": 28.87,
        "fontSizePt": 28.87,
        "lineHeight": 34.64,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 95,
        "y": 128,
        "width": 384,
        "height": 65,
        "centerX": 287,
        "centerY": 160.5,
        "hidden": false
      },
      "警語": {
        "x": 197,
        "y": 198,
        "width": 180,
        "height": 16,
        "centerX": 287,
        "centerY": 206,
        "hidden": false,
        "fontSizePx": 16.5,
        "fontSizePt": 16.5,
        "lineHeight": 19.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 578.7,
        "y": 1.8,
        "width": 257.5,
        "height": 226.4,
        "centerX": 707.5,
        "centerY": 115
      },
      "P": {
        "x": 542.84,
        "y": 19.72,
        "width": 314.13,
        "height": 169.8,
        "centerX": 699.9,
        "centerY": 104.62,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_01": {
        "x": 717.5,
        "y": 50.11,
        "width": 115.86,
        "height": 156.21,
        "centerX": 775.43,
        "centerY": 128.22,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 624.27,
        "y": 8.57,
        "width": 75.66,
        "height": 198.84,
        "centerX": 662.09,
        "centerY": 107.99,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 837,
        "y": 36,
        "width": 85,
        "height": 66,
        "centerX": 879.5,
        "centerY": 69,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 515,
        "y": 25,
        "width": 122,
        "height": 84,
        "centerX": 576,
        "centerY": 67,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 970,
        "height": 250,
        "centerX": 485,
        "centerY": 125,
        "hidden": false,
        "locked": true
      }
    }
  },
  "Appier_1200x627|banner7": {
    "sourceFile": "Appier_banner7_1200x627_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 122,
        "y": 65,
        "width": 335,
        "height": 354,
        "centerX": 289.5,
        "centerY": 242,
        "hidden": false
      },
      "副標題": {
        "x": 67.5,
        "y": 461,
        "width": 442,
        "height": 43,
        "centerX": 288.5,
        "centerY": 482.5,
        "hidden": false,
        "fontSizePx": 44.81,
        "fontSizePt": 44.81,
        "lineHeight": 53.77,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 61,
        "y": 451,
        "width": 149,
        "height": 52,
        "centerX": 135.5,
        "centerY": 477,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 214,
        "y": 467,
        "width": 302,
        "height": 35,
        "centerX": 365,
        "centerY": 484.5,
        "hidden": true,
        "fontSizePx": 36.44,
        "fontSizePt": 36.44,
        "lineHeight": 43.73,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 39.5,
        "y": 441,
        "width": 498,
        "height": 82,
        "centerX": 288.5,
        "centerY": 482,
        "hidden": false
      },
      "警語": {
        "x": 174,
        "y": 529,
        "width": 230,
        "height": 20,
        "centerX": 289,
        "centerY": 539,
        "hidden": false,
        "fontSizePx": 21,
        "fontSizePt": 21,
        "lineHeight": 25.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 577,
        "y": 47,
        "width": 606,
        "height": 533,
        "centerX": 880,
        "centerY": 313.5
      },
      "P": {
        "x": 580,
        "y": 201,
        "width": 600,
        "height": 325,
        "centerX": 880,
        "centerY": 363.5,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 832,
        "y": 227,
        "width": 313,
        "height": 312,
        "centerX": 988.5,
        "centerY": 383,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 550,
        "y": 43,
        "width": 486,
        "height": 379,
        "centerX": 793,
        "centerY": 232.5,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1037,
        "y": 55,
        "width": 151,
        "height": 126,
        "centerX": 1112.5,
        "centerY": 118,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 554,
        "y": 33,
        "width": 276,
        "height": 188,
        "centerX": 692,
        "centerY": 127,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1200,
        "height": 627,
        "centerX": 600,
        "centerY": 313.5,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 767.6,
        "y": 291.34,
        "width": 381,
        "height": 148,
        "centerX": 958.1,
        "centerY": 365.34,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 164.2,
        "fontSizePt": 164.2,
        "lineHeight": 177.34,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_1536x2048|banner7": {
    "sourceFile": "Appier_banner7_1536x2048_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 432,
        "y": 105,
        "width": 674,
        "height": 713,
        "centerX": 769,
        "centerY": 461.5,
        "hidden": false
      },
      "副標題": {
        "x": 359.5,
        "y": 878,
        "width": 817,
        "height": 79,
        "centerX": 768,
        "centerY": 917.5,
        "hidden": false,
        "fontSizePx": 82.88,
        "fontSizePt": 82.88,
        "lineHeight": 99.46,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 347,
        "y": 859,
        "width": 276,
        "height": 97,
        "centerX": 485,
        "centerY": 907.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 630,
        "y": 890,
        "width": 559,
        "height": 64,
        "centerX": 909.5,
        "centerY": 922,
        "hidden": true,
        "fontSizePx": 67.42,
        "fontSizePt": 67.42,
        "lineHeight": 80.9,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 309.5,
        "y": 841,
        "width": 917,
        "height": 152,
        "centerX": 768,
        "centerY": 917,
        "hidden": false
      },
      "警語": {
        "x": 555,
        "y": 1004,
        "width": 425,
        "height": 37,
        "centerX": 767.5,
        "centerY": 1022.5,
        "hidden": false,
        "fontSizePx": 39,
        "fontSizePt": 39,
        "lineHeight": 46.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 260,
        "y": 1081,
        "width": 1018,
        "height": 896,
        "centerX": 769,
        "centerY": 1529
      },
      "P": {
        "x": 85,
        "y": 1159,
        "width": 1367,
        "height": 740,
        "centerX": 768.5,
        "centerY": 1529,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 661,
        "y": 1321,
        "width": 571,
        "height": 569,
        "centerX": 946.5,
        "centerY": 1605.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 135,
        "y": 1058,
        "width": 909,
        "height": 711,
        "centerX": 589.5,
        "centerY": 1413.5,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1125,
        "y": 1066,
        "width": 265,
        "height": 220,
        "centerX": 1257.5,
        "centerY": 1176,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 155,
        "y": 1013,
        "width": 538,
        "height": 337,
        "centerX": 424,
        "centerY": 1181.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1536,
        "height": 2048,
        "centerX": 768,
        "centerY": 1024,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 512.94,
        "y": 1363.69,
        "width": 867,
        "height": 339.02,
        "centerX": 946.44,
        "centerY": 1533.2,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 374.09,
        "fontSizePt": 374.09,
        "lineHeight": 404.01,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_2048x1536|banner7": {
    "sourceFile": "Appier_banner7_2048x1536_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 810,
        "y": 71,
        "width": 429,
        "height": 96,
        "centerX": 1024.5,
        "centerY": 119,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 497,
        "y": 197,
        "width": 1054,
        "height": 146,
        "centerX": 1024,
        "centerY": 270,
        "hidden": false
      },
      "副標題": {
        "x": 544.5,
        "y": 416,
        "width": 959,
        "height": 92,
        "centerX": 1024,
        "centerY": 462,
        "hidden": false,
        "fontSizePx": 97.25,
        "fontSizePt": 97.25,
        "lineHeight": 116.7,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 497,
        "y": 372,
        "width": 1054,
        "height": 178,
        "centerX": 1024,
        "centerY": 461,
        "hidden": false
      },
      "警語": {
        "x": 779,
        "y": 562,
        "width": 490,
        "height": 42,
        "centerX": 1024,
        "centerY": 583,
        "hidden": false,
        "fontSizePx": 45,
        "fontSizePt": 45,
        "lineHeight": 54,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 318.5,
        "y": 422.6,
        "width": 1412.8,
        "height": 1242.7,
        "centerX": 1024.9,
        "centerY": 1044
      },
      "P_01": {
        "x": 318.43,
        "y": 422.6,
        "width": 1412.95,
        "height": 1242.7,
        "centerX": 1024.9,
        "centerY": 1043.95,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 61.66,
        "y": 419.78,
        "width": 1330.65,
        "height": 1041.25,
        "centerX": 726.99,
        "centerY": 940.4,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1469,
        "y": 609,
        "width": 262,
        "height": 219,
        "centerX": 1600,
        "centerY": 718.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 132.3,
        "y": 491.8,
        "width": 472,
        "height": 372.5,
        "centerX": 368.3,
        "centerY": 678,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 2048,
        "height": 1536,
        "centerX": 1024,
        "centerY": 768,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 760.84,
        "y": 872.66,
        "width": 896,
        "height": 350.42,
        "centerX": 1208.84,
        "centerY": 1047.87,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 386.67,
        "fontSizePt": 386.67,
        "lineHeight": 417.6,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_300x600|banner7": {
    "sourceFile": "Appier_banner7_300x600_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 47,
        "y": 52,
        "width": 206,
        "height": 218,
        "centerX": 150,
        "centerY": 161,
        "hidden": false
      },
      "副標題": {
        "x": 42,
        "y": 290,
        "width": 216,
        "height": 21,
        "centerX": 150,
        "centerY": 300.5,
        "hidden": false,
        "fontSizePx": 21.91,
        "fontSizePt": 21.91,
        "lineHeight": 26.29,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 39,
        "y": 285,
        "width": 73,
        "height": 26,
        "centerX": 75.5,
        "centerY": 298,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 114,
        "y": 293,
        "width": 148,
        "height": 17,
        "centerX": 188,
        "centerY": 301.5,
        "hidden": true,
        "fontSizePx": 17.82,
        "fontSizePt": 17.82,
        "lineHeight": 21.38,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 28,
        "y": 280,
        "width": 244,
        "height": 41,
        "centerX": 150,
        "centerY": 300.5,
        "hidden": false
      },
      "警語": {
        "x": 95,
        "y": 323,
        "width": 110,
        "height": 10,
        "centerX": 150,
        "centerY": 328,
        "hidden": false,
        "fontSizePx": 10,
        "fontSizePt": 10,
        "lineHeight": 12,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 17,
        "y": 338,
        "width": 267,
        "height": 235,
        "centerX": 150.5,
        "centerY": 455.5
      },
      "P": {
        "x": 8,
        "y": 378,
        "width": 286,
        "height": 155,
        "centerX": 151,
        "centerY": 455.5,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 143,
        "y": 404,
        "width": 136,
        "height": 135,
        "centerX": 211,
        "centerY": 471.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 21,
        "y": 340,
        "width": 213,
        "height": 165,
        "centerX": 127.5,
        "centerY": 422.5,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": -0.5,
        "y": 339.7,
        "width": 80,
        "height": 56.5,
        "centerX": 39.5,
        "centerY": 367.9,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 243,
        "y": 347,
        "width": 84,
        "height": 58,
        "centerX": 285,
        "centerY": 376,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 300,
        "height": 600,
        "centerX": 150,
        "centerY": 300,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 97.22,
        "y": 420.88,
        "width": 182,
        "height": 71,
        "centerX": 188.22,
        "centerY": 456.38,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 78.27,
        "fontSizePt": 78.27,
        "lineHeight": 84.52,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_320x480|banner7": {
    "sourceFile": "Appier_banner7_320x480_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 84,
        "y": 33,
        "width": 153,
        "height": 161,
        "centerX": 160.5,
        "centerY": 113.5,
        "hidden": false
      },
      "副標題": {
        "x": 68,
        "y": 209,
        "width": 183,
        "height": 18,
        "centerX": 159.5,
        "centerY": 218,
        "hidden": false,
        "fontSizePx": 18.49,
        "fontSizePt": 18.49,
        "lineHeight": 22.19,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 66,
        "y": 205,
        "width": 62,
        "height": 22,
        "centerX": 97,
        "centerY": 216,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 129,
        "y": 211,
        "width": 125,
        "height": 15,
        "centerX": 191.5,
        "centerY": 218.5,
        "hidden": true,
        "fontSizePx": 15.04,
        "fontSizePt": 15.04,
        "lineHeight": 18.05,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 54,
        "y": 200,
        "width": 211,
        "height": 35,
        "centerX": 159.5,
        "centerY": 217.5,
        "hidden": false
      },
      "警語": {
        "x": 110,
        "y": 237,
        "width": 101,
        "height": 9,
        "centerX": 160.5,
        "centerY": 241.5,
        "hidden": false,
        "fontSizePx": 9.13,
        "fontSizePt": 9.13,
        "lineHeight": 10.96,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 38,
        "y": 253,
        "width": 244,
        "height": 215,
        "centerX": 160,
        "centerY": 360.5
      },
      "P_01": {
        "x": 38,
        "y": 253,
        "width": 244,
        "height": 215,
        "centerX": 160,
        "centerY": 360.5,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 39,
        "y": 254,
        "width": 200,
        "height": 154,
        "centerX": 139,
        "centerY": 331,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 243,
        "y": 249,
        "width": 62,
        "height": 52,
        "centerX": 274,
        "centerY": 275,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 19,
        "y": 240,
        "width": 120,
        "height": 75,
        "centerX": 79,
        "centerY": 277.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 480,
        "centerX": 160,
        "centerY": 240,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 114.26,
        "y": 331.17,
        "width": 155,
        "height": 60,
        "centerX": 191.76,
        "centerY": 361.17,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 66.78,
        "fontSizePt": 66.78,
        "lineHeight": 72.11,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_480x320|banner7": {
    "sourceFile": "Appier_banner7_480x320_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 186,
        "y": 9,
        "width": 109,
        "height": 26,
        "centerX": 240.5,
        "centerY": 22,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 107,
        "y": 41,
        "width": 266,
        "height": 37,
        "centerX": 240,
        "centerY": 59.5,
        "hidden": false
      },
      "副標題": {
        "x": 119,
        "y": 96,
        "width": 243,
        "height": 24,
        "centerX": 240.5,
        "centerY": 108,
        "hidden": false,
        "fontSizePx": 24.59,
        "fontSizePt": 24.59,
        "lineHeight": 29.51,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 115,
        "y": 90,
        "width": 82,
        "height": 29,
        "centerX": 156,
        "centerY": 104.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 199,
        "y": 99,
        "width": 166,
        "height": 20,
        "centerX": 282,
        "centerY": 109,
        "hidden": true,
        "fontSizePx": 20,
        "fontSizePt": 20,
        "lineHeight": 24,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 107.5,
        "y": 85,
        "width": 266,
        "height": 45,
        "centerX": 240.5,
        "centerY": 107.5,
        "hidden": false
      },
      "警語": {
        "x": 179,
        "y": 133,
        "width": 123,
        "height": 11,
        "centerX": 240.5,
        "centerY": 138.5,
        "hidden": false,
        "fontSizePx": 11.2,
        "fontSizePt": 11.2,
        "lineHeight": 13.44,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 149,
        "y": 149,
        "width": 184,
        "height": 161,
        "centerX": 241,
        "centerY": 229.5
      },
      "P": {
        "x": 102,
        "y": 150,
        "width": 277,
        "height": 150,
        "centerX": 240.5,
        "centerY": 225,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 237,
        "y": 180,
        "width": 112,
        "height": 110,
        "centerX": 293,
        "centerY": 235,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 102,
        "y": 147,
        "width": 191,
        "height": 148,
        "centerX": 197.5,
        "centerY": 221,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 353,
        "y": 137,
        "width": 68,
        "height": 56,
        "centerX": 387,
        "centerY": 165,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 46.9,
        "y": 130.6,
        "width": 101,
        "height": 79.7,
        "centerX": 97.4,
        "centerY": 170.4,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 480,
        "height": 320,
        "centerX": 240,
        "centerY": 160,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 188.56,
        "y": 191.35,
        "width": 176,
        "height": 69,
        "centerX": 276.56,
        "centerY": 225.85,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 75.8,
        "fontSizePt": 75.8,
        "lineHeight": 81.86,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_600x1200|banner7": {
    "sourceFile": "Appier_banner7_600x1200_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 123,
        "y": 136,
        "width": 354,
        "height": 375,
        "centerX": 300,
        "centerY": 323.5,
        "hidden": false
      },
      "副標題": {
        "x": 88,
        "y": 543,
        "width": 424,
        "height": 41,
        "centerX": 300,
        "centerY": 563.5,
        "hidden": false,
        "fontSizePx": 43,
        "fontSizePt": 43,
        "lineHeight": 51.6,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 81,
        "y": 533,
        "width": 143,
        "height": 50,
        "centerX": 152.5,
        "centerY": 558,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 228,
        "y": 549,
        "width": 291,
        "height": 34,
        "centerX": 373.5,
        "centerY": 566,
        "hidden": true,
        "fontSizePx": 35,
        "fontSizePt": 35,
        "lineHeight": 42,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 61,
        "y": 523,
        "width": 478,
        "height": 80,
        "centerX": 300,
        "centerY": 563,
        "hidden": false
      },
      "警語": {
        "x": 185,
        "y": 608,
        "width": 230,
        "height": 20,
        "centerX": 300,
        "centerY": 618,
        "hidden": false,
        "fontSizePx": 21,
        "fontSizePt": 21,
        "lineHeight": 25.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 51,
        "y": 645,
        "width": 500,
        "height": 438,
        "centerX": 301,
        "centerY": 864
      },
      "P": {
        "x": 15,
        "y": 719,
        "width": 571,
        "height": 310,
        "centerX": 300.5,
        "centerY": 874,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 275,
        "y": 790,
        "width": 268,
        "height": 267,
        "centerX": 409,
        "centerY": 923.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 28,
        "y": 660,
        "width": 432,
        "height": 336,
        "centerX": 244,
        "centerY": 828,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 480,
        "y": 673,
        "width": 82,
        "height": 69,
        "centerX": 521,
        "centerY": 707.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 55,
        "y": 632,
        "width": 220,
        "height": 149,
        "centerX": 165,
        "centerY": 706.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 600,
        "height": 1200,
        "centerX": 300,
        "centerY": 600,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 193.83,
        "y": 805.75,
        "width": 362,
        "height": 140,
        "centerX": 374.83,
        "centerY": 875.75,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 156.26,
        "fontSizePt": 156.26,
        "lineHeight": 168.75,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_600x500|banner7": {
    "sourceFile": "Appier_banner7_600x500_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 236,
        "y": 31,
        "width": 133,
        "height": 30,
        "centerX": 302.5,
        "centerY": 46,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 136,
        "y": 71,
        "width": 330,
        "height": 46,
        "centerX": 301,
        "centerY": 94,
        "hidden": false
      },
      "副標題": {
        "x": 153.5,
        "y": 138,
        "width": 294,
        "height": 29,
        "centerX": 300.5,
        "centerY": 152.5,
        "hidden": false,
        "fontSizePx": 29.76,
        "fontSizePt": 29.76,
        "lineHeight": 35.71,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 149,
        "y": 131,
        "width": 99,
        "height": 35,
        "centerX": 198.5,
        "centerY": 148.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 250,
        "y": 142,
        "width": 202,
        "height": 24,
        "centerX": 351,
        "centerY": 154,
        "hidden": true,
        "fontSizePx": 24.22,
        "fontSizePt": 24.22,
        "lineHeight": 29.06,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 135.5,
        "y": 125,
        "width": 330,
        "height": 55,
        "centerX": 300.5,
        "centerY": 152.5,
        "hidden": false
      },
      "警語": {
        "x": 221,
        "y": 183,
        "width": 159,
        "height": 14,
        "centerX": 300.5,
        "centerY": 190,
        "hidden": false,
        "fontSizePx": 14.5,
        "fontSizePt": 14.5,
        "lineHeight": 17.4,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 144,
        "y": 208,
        "width": 313,
        "height": 275,
        "centerX": 300.5,
        "centerY": 345.5
      },
      "P": {
        "x": 73,
        "y": 222,
        "width": 453,
        "height": 246,
        "centerX": 299.5,
        "centerY": 345,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 266,
        "y": 272,
        "width": 187,
        "height": 186,
        "centerX": 359.5,
        "centerY": 365,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 68,
        "y": 208,
        "width": 297,
        "height": 231,
        "centerX": 216.5,
        "centerY": 323.5,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 428,
        "y": 204,
        "width": 79,
        "height": 66,
        "centerX": 467.5,
        "centerY": 237,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 84,
        "y": 200,
        "width": 155,
        "height": 106,
        "centerX": 161.5,
        "centerY": 253,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 600,
        "height": 500,
        "centerX": 300,
        "centerY": 250,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 214.47,
        "y": 290.4,
        "width": 288,
        "height": 112,
        "centerX": 358.47,
        "centerY": 346.4,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 123.98,
        "fontSizePt": 123.98,
        "lineHeight": 133.9,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_640x960|banner7": {
    "sourceFile": "Appier_banner7_640x960_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 154,
        "y": 63,
        "width": 333,
        "height": 351,
        "centerX": 320.5,
        "centerY": 238.5,
        "hidden": false
      },
      "副標題": {
        "x": 119.5,
        "y": 444,
        "width": 400,
        "height": 39,
        "centerX": 319.5,
        "centerY": 463.5,
        "hidden": false,
        "fontSizePx": 40.57,
        "fontSizePt": 40.57,
        "lineHeight": 48.68,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 114,
        "y": 435,
        "width": 135,
        "height": 47,
        "centerX": 181.5,
        "centerY": 458.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 253,
        "y": 450,
        "width": 274,
        "height": 32,
        "centerX": 390,
        "centerY": 466,
        "hidden": true,
        "fontSizePx": 33,
        "fontSizePt": 33,
        "lineHeight": 39.6,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 90.5,
        "y": 426,
        "width": 458,
        "height": 75,
        "centerX": 319.5,
        "centerY": 463.5,
        "hidden": false
      },
      "警語": {
        "x": 217,
        "y": 506,
        "width": 207,
        "height": 18,
        "centerX": 320.5,
        "centerY": 515,
        "hidden": false,
        "fontSizePx": 19,
        "fontSizePt": 19,
        "lineHeight": 22.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 104,
        "y": 544,
        "width": 431,
        "height": 380,
        "centerX": 319.5,
        "centerY": 734
      },
      "P": {
        "x": 34,
        "y": 544,
        "width": 573,
        "height": 310,
        "centerX": 320.5,
        "centerY": 699,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 297,
        "y": 659,
        "width": 240,
        "height": 239,
        "centerX": 417,
        "centerY": 778.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 40,
        "y": 544,
        "width": 387,
        "height": 300,
        "centerX": 233.5,
        "centerY": 694,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 490,
        "y": 526.8,
        "width": 121,
        "height": 85.4,
        "centerX": 550.5,
        "centerY": 569.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 53,
        "y": 526,
        "width": 220,
        "height": 149,
        "centerX": 163,
        "centerY": 600.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 640,
        "height": 960,
        "centerX": 320,
        "centerY": 480,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 213.09,
        "y": 630.25,
        "width": 364,
        "height": 141,
        "centerX": 395.09,
        "centerY": 700.75,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 156.82,
        "fontSizePt": 156.82,
        "lineHeight": 169.35,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_960x640|banner7": {
    "sourceFile": "Appier_banner7_960x640_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 393,
        "y": 28,
        "width": 176,
        "height": 41,
        "centerX": 481,
        "centerY": 48.5,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 264,
        "y": 80,
        "width": 433,
        "height": 60,
        "centerX": 480.5,
        "centerY": 110,
        "hidden": false
      },
      "副標題": {
        "x": 287,
        "y": 170,
        "width": 386,
        "height": 37,
        "centerX": 480,
        "centerY": 188.5,
        "hidden": false,
        "fontSizePx": 39.12,
        "fontSizePt": 39.12,
        "lineHeight": 46.94,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 281,
        "y": 161,
        "width": 130,
        "height": 46,
        "centerX": 346,
        "centerY": 184,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 415,
        "y": 175,
        "width": 264,
        "height": 31,
        "centerX": 547,
        "centerY": 190.5,
        "hidden": true,
        "fontSizePx": 31.82,
        "fontSizePt": 31.82,
        "lineHeight": 38.18,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 263.5,
        "y": 152,
        "width": 433,
        "height": 73,
        "centerX": 480,
        "centerY": 188.5,
        "hidden": false
      },
      "警語": {
        "x": 377,
        "y": 229,
        "width": 208,
        "height": 18,
        "centerX": 481,
        "centerY": 238,
        "hidden": false,
        "fontSizePx": 19,
        "fontSizePt": 19,
        "lineHeight": 22.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 271,
        "y": 258,
        "width": 419,
        "height": 370,
        "centerX": 480.5,
        "centerY": 443
      },
      "P": {
        "x": 139,
        "y": 270,
        "width": 684,
        "height": 370,
        "centerX": 481,
        "centerY": 455,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 450,
        "y": 349,
        "width": 270,
        "height": 269,
        "centerX": 585,
        "centerY": 483.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 167,
        "y": 258,
        "width": 427,
        "height": 333,
        "centerX": 380.5,
        "centerY": 424.5,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 687,
        "y": 248,
        "width": 121,
        "height": 101,
        "centerX": 747.5,
        "centerY": 298.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 189,
        "y": 243,
        "width": 219,
        "height": 149,
        "centerX": 298.5,
        "centerY": 317.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 960,
        "height": 640,
        "centerX": 480,
        "centerY": 320,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 353.04,
        "y": 373.1,
        "width": 434,
        "height": 168,
        "centerX": 570.04,
        "centerY": 457.1,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 187.19,
        "fontSizePt": 187.19,
        "lineHeight": 202.16,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_970x250|banner7": {
    "sourceFile": "Appier_banner7_970x250_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 206,
        "y": 24,
        "width": 163,
        "height": 37,
        "centerX": 287.5,
        "centerY": 42.5,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 95,
        "y": 67,
        "width": 384,
        "height": 53,
        "centerX": 287,
        "centerY": 93.5,
        "hidden": false
      },
      "副標題": {
        "x": 112,
        "y": 144,
        "width": 350,
        "height": 34,
        "centerX": 287,
        "centerY": 161,
        "hidden": false,
        "fontSizePx": 35.5,
        "fontSizePt": 35.5,
        "lineHeight": 42.6,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 107,
        "y": 136,
        "width": 118,
        "height": 42,
        "centerX": 166,
        "centerY": 157,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 228,
        "y": 149,
        "width": 239,
        "height": 28,
        "centerX": 347.5,
        "centerY": 163,
        "hidden": true,
        "fontSizePx": 28.87,
        "fontSizePt": 28.87,
        "lineHeight": 34.64,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 95,
        "y": 128,
        "width": 384,
        "height": 65,
        "centerX": 287,
        "centerY": 160.5,
        "hidden": false
      },
      "警語": {
        "x": 197,
        "y": 198,
        "width": 180,
        "height": 16,
        "centerX": 287,
        "centerY": 206,
        "hidden": false,
        "fontSizePx": 16.5,
        "fontSizePt": 16.5,
        "lineHeight": 19.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 571,
        "y": 5,
        "width": 273,
        "height": 240,
        "centerX": 707.5,
        "centerY": 125
      },
      "P": {
        "x": 533,
        "y": 24,
        "width": 333,
        "height": 180,
        "centerX": 699.5,
        "centerY": 114,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 705,
        "y": 70,
        "width": 138,
        "height": 136,
        "centerX": 774,
        "centerY": 138,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 559,
        "y": 9,
        "width": 216,
        "height": 168,
        "centerX": 667,
        "centerY": 93,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 837,
        "y": 36,
        "width": 85,
        "height": 66,
        "centerX": 879.5,
        "centerY": 69,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 482,
        "y": 21.9,
        "width": 122,
        "height": 96.3,
        "centerX": 543,
        "centerY": 70,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 970,
        "height": 250,
        "centerX": 485,
        "centerY": 125,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 636.86,
        "y": 73.53,
        "width": 212,
        "height": 83,
        "centerX": 742.86,
        "centerY": 115.03,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 91.14,
        "fontSizePt": 91.14,
        "lineHeight": 98.43,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_1200x627|banner8": {
    "sourceFile": "Appier_banner8_1200x627_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 122,
        "y": 65,
        "width": 335,
        "height": 354,
        "centerX": 289.5,
        "centerY": 242,
        "hidden": false
      },
      "副標題": {
        "x": 63,
        "y": 461,
        "width": 451,
        "height": 43,
        "centerX": 288.5,
        "centerY": 482.5,
        "hidden": false,
        "fontSizePx": 44.81,
        "fontSizePt": 44.81,
        "lineHeight": 53.77,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 61,
        "y": 451,
        "width": 149,
        "height": 52,
        "centerX": 135.5,
        "centerY": 477,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 214,
        "y": 467,
        "width": 302,
        "height": 35,
        "centerX": 365,
        "centerY": 484.5,
        "hidden": true,
        "fontSizePx": 36.44,
        "fontSizePt": 36.44,
        "lineHeight": 43.73,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 35,
        "y": 441,
        "width": 507,
        "height": 82,
        "centerX": 288.5,
        "centerY": 482,
        "hidden": false
      },
      "警語": {
        "x": 174,
        "y": 529,
        "width": 230,
        "height": 20,
        "centerX": 289,
        "centerY": 539,
        "hidden": false,
        "fontSizePx": 21,
        "fontSizePt": 21,
        "lineHeight": 25.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 577,
        "y": 47,
        "width": 606,
        "height": 533,
        "centerX": 880,
        "centerY": 313.5
      },
      "P": {
        "x": 580,
        "y": 201,
        "width": 600,
        "height": 325,
        "centerX": 880,
        "centerY": 363.5,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 832,
        "y": 227,
        "width": 313,
        "height": 312,
        "centerX": 988.5,
        "centerY": 383,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 550,
        "y": 43,
        "width": 486,
        "height": 379,
        "centerX": 793,
        "centerY": 232.5,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1037,
        "y": 55,
        "width": 151,
        "height": 126,
        "centerX": 1112.5,
        "centerY": 118,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 554,
        "y": 33,
        "width": 276,
        "height": 188,
        "centerX": 692,
        "centerY": 127,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1200,
        "height": 627,
        "centerX": 600,
        "centerY": 313.5,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 761.19,
        "y": 294.33,
        "width": 389,
        "height": 139,
        "centerX": 955.69,
        "centerY": 363.83,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 154.9,
        "fontSizePt": 154.9,
        "lineHeight": 167.3,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_1536x2048|banner8": {
    "sourceFile": "Appier_banner8_1536x2048_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 432,
        "y": 105,
        "width": 674,
        "height": 713,
        "centerX": 769,
        "centerY": 461.5,
        "hidden": false
      },
      "副標題": {
        "x": 351.5,
        "y": 878,
        "width": 833,
        "height": 79,
        "centerX": 768,
        "centerY": 917.5,
        "hidden": false,
        "fontSizePx": 82.88,
        "fontSizePt": 82.88,
        "lineHeight": 99.46,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 347,
        "y": 859,
        "width": 276,
        "height": 97,
        "centerX": 485,
        "centerY": 907.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 630,
        "y": 890,
        "width": 559,
        "height": 64,
        "centerX": 909.5,
        "centerY": 922,
        "hidden": true,
        "fontSizePx": 67.42,
        "fontSizePt": 67.42,
        "lineHeight": 80.9,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 301.5,
        "y": 841,
        "width": 933,
        "height": 152,
        "centerX": 768,
        "centerY": 917,
        "hidden": false
      },
      "警語": {
        "x": 555,
        "y": 1004,
        "width": 425,
        "height": 37,
        "centerX": 767.5,
        "centerY": 1022.5,
        "hidden": false,
        "fontSizePx": 39,
        "fontSizePt": 39,
        "lineHeight": 46.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 260,
        "y": 1081,
        "width": 1018,
        "height": 896,
        "centerX": 769,
        "centerY": 1529
      },
      "P": {
        "x": 85,
        "y": 1159,
        "width": 1367,
        "height": 740,
        "centerX": 768.5,
        "centerY": 1529,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 661,
        "y": 1321,
        "width": 571,
        "height": 569,
        "centerX": 946.5,
        "centerY": 1605.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 135,
        "y": 1058,
        "width": 909,
        "height": 711,
        "centerX": 589.5,
        "centerY": 1413.5,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1125,
        "y": 1066,
        "width": 265,
        "height": 220,
        "centerX": 1257.5,
        "centerY": 1176,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 60.8,
        "y": 887.7,
        "width": 538,
        "height": 424.6,
        "centerX": 329.8,
        "centerY": 1100,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1536,
        "height": 2048,
        "centerX": 768,
        "centerY": 1024,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 498.44,
        "y": 1369.83,
        "width": 885,
        "height": 319.83,
        "centerX": 940.94,
        "centerY": 1529.74,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 352.92,
        "fontSizePt": 352.92,
        "lineHeight": 381.14,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_160x600|banner8": {
    "sourceFile": "Appier_banner8_160x600_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 16,
        "y": 102,
        "width": 128,
        "height": 136,
        "centerX": 80,
        "centerY": 170,
        "hidden": false
      },
      "副標題_上": {
        "x": 18,
        "y": 255,
        "width": 124,
        "height": 29,
        "centerX": 80,
        "centerY": 269.5,
        "hidden": false,
        "fontSizePx": 30.11,
        "fontSizePt": 30.11,
        "lineHeight": 36.13,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_下": {
        "x": 17,
        "y": 294,
        "width": 126,
        "height": 56,
        "centerX": 80,
        "centerY": 322,
        "hidden": true,
        "fontSizePx": 62.42,
        "fontSizePt": 62.42,
        "lineHeight": 74.9,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "警語": {
        "x": 14,
        "y": 363,
        "width": 131,
        "height": 12,
        "centerX": 79.5,
        "centerY": 369,
        "hidden": false,
        "fontSizePx": 12.38,
        "fontSizePt": 12.38,
        "lineHeight": 14.86,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P": {
        "x": 3,
        "y": 410,
        "width": 155,
        "height": 83,
        "centerX": 80.5,
        "centerY": 451.5,
        "hidden": false,
        "locked": false
      },
      "P_範圍": {
        "x": 2,
        "y": 383,
        "width": 157,
        "height": 139,
        "centerX": 80.5,
        "centerY": 452.5
      },
      "P_01": {
        "x": 72,
        "y": 430,
        "width": 79,
        "height": 79,
        "centerX": 111.5,
        "centerY": 469.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 4,
        "y": 392,
        "width": 126,
        "height": 98,
        "centerX": 67,
        "centerY": 441,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 93,
        "y": 535,
        "width": 63,
        "height": 52,
        "centerX": 124.5,
        "centerY": 561,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 9,
        "y": 10,
        "width": 131,
        "height": 89,
        "centerX": 74.5,
        "centerY": 54.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 160,
        "height": 600,
        "centerX": 80,
        "centerY": 300,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 49.56,
        "y": 433.58,
        "width": 101,
        "height": 36,
        "centerX": 100.06,
        "centerY": 451.58,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 40.02,
        "fontSizePt": 40.02,
        "lineHeight": 43.22,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_2048x1536|banner8": {
    "sourceFile": "Appier_banner8_2048x1536_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 810,
        "y": 71,
        "width": 429,
        "height": 96,
        "centerX": 1024.5,
        "centerY": 119,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 497,
        "y": 197,
        "width": 1054,
        "height": 146,
        "centerX": 1024,
        "centerY": 270,
        "hidden": false
      },
      "副標題": {
        "x": 535.5,
        "y": 416,
        "width": 977,
        "height": 92,
        "centerX": 1024,
        "centerY": 462,
        "hidden": false,
        "fontSizePx": 97.25,
        "fontSizePt": 97.25,
        "lineHeight": 116.7,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 497,
        "y": 372,
        "width": 1054,
        "height": 178,
        "centerX": 1024,
        "centerY": 461,
        "hidden": false
      },
      "警語": {
        "x": 779,
        "y": 562,
        "width": 490,
        "height": 42,
        "centerX": 1024,
        "centerY": 583,
        "hidden": false,
        "fontSizePx": 45,
        "fontSizePt": 45,
        "lineHeight": 54,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 276.1,
        "y": 395.3,
        "width": 1497.6,
        "height": 1317.3,
        "centerX": 1024.9,
        "centerY": 1054
      },
      "P_01": {
        "x": 276.02,
        "y": 395.3,
        "width": 1497.77,
        "height": 1317.3,
        "centerX": 1024.9,
        "centerY": 1053.95,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 3.85,
        "y": 392.3,
        "width": 1410.53,
        "height": 1103.76,
        "centerX": 709.11,
        "centerY": 944.18,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 1469,
        "y": 609,
        "width": 262,
        "height": 219,
        "centerX": 1600,
        "centerY": 718.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 95,
        "y": 480.3,
        "width": 472,
        "height": 372.5,
        "centerX": 331,
        "centerY": 666.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 2048,
        "height": 1536,
        "centerX": 1024,
        "centerY": 768,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 729.35,
        "y": 879.41,
        "width": 969,
        "height": 350.44,
        "centerX": 1213.85,
        "centerY": 1054.63,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 386.69,
        "fontSizePt": 386.69,
        "lineHeight": 417.62,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_300x600|banner8": {
    "sourceFile": "Appier_banner8_300x600_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 47,
        "y": 52,
        "width": 206,
        "height": 218,
        "centerX": 150,
        "centerY": 161,
        "hidden": false
      },
      "副標題": {
        "x": 39.5,
        "y": 290,
        "width": 221,
        "height": 21,
        "centerX": 150,
        "centerY": 300.5,
        "hidden": false,
        "fontSizePx": 21.91,
        "fontSizePt": 21.91,
        "lineHeight": 26.29,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 39,
        "y": 285,
        "width": 73,
        "height": 26,
        "centerX": 75.5,
        "centerY": 298,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 114,
        "y": 293,
        "width": 148,
        "height": 17,
        "centerX": 188,
        "centerY": 301.5,
        "hidden": true,
        "fontSizePx": 17.82,
        "fontSizePt": 17.82,
        "lineHeight": 21.38,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 25.5,
        "y": 280,
        "width": 249,
        "height": 41,
        "centerX": 150,
        "centerY": 300.5,
        "hidden": false
      },
      "警語": {
        "x": 95,
        "y": 323,
        "width": 110,
        "height": 10,
        "centerX": 150,
        "centerY": 328,
        "hidden": false,
        "fontSizePx": 10,
        "fontSizePt": 10,
        "lineHeight": 12,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 17,
        "y": 338,
        "width": 267,
        "height": 235,
        "centerX": 150.5,
        "centerY": 455.5
      },
      "P": {
        "x": 8,
        "y": 378,
        "width": 286,
        "height": 155,
        "centerX": 151,
        "centerY": 455.5,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 143,
        "y": 404,
        "width": 136,
        "height": 135,
        "centerX": 211,
        "centerY": 471.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 21,
        "y": 340,
        "width": 213,
        "height": 165,
        "centerX": 127.5,
        "centerY": 422.5,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 7.2,
        "y": 342.5,
        "width": 80,
        "height": 56.5,
        "centerX": 47.2,
        "centerY": 370.8,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 243,
        "y": 347,
        "width": 84,
        "height": 58,
        "centerX": 285,
        "centerY": 376,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 300,
        "height": 600,
        "centerX": 150,
        "centerY": 300,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 94.57,
        "y": 422.66,
        "width": 185,
        "height": 66,
        "centerX": 187.07,
        "centerY": 455.66,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 73.84,
        "fontSizePt": 73.84,
        "lineHeight": 79.73,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_320x480|banner8": {
    "sourceFile": "Appier_banner8_320x480_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 84,
        "y": 33,
        "width": 153,
        "height": 161,
        "centerX": 160.5,
        "centerY": 113.5,
        "hidden": false
      },
      "副標題": {
        "x": 66.5,
        "y": 209,
        "width": 186,
        "height": 18,
        "centerX": 159.5,
        "centerY": 218,
        "hidden": false,
        "fontSizePx": 18.49,
        "fontSizePt": 18.49,
        "lineHeight": 22.19,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 66,
        "y": 205,
        "width": 62,
        "height": 22,
        "centerX": 97,
        "centerY": 216,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 129,
        "y": 211,
        "width": 125,
        "height": 15,
        "centerX": 191.5,
        "centerY": 218.5,
        "hidden": true,
        "fontSizePx": 15.04,
        "fontSizePt": 15.04,
        "lineHeight": 18.05,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 52.5,
        "y": 200,
        "width": 214,
        "height": 35,
        "centerX": 159.5,
        "centerY": 217.5,
        "hidden": false
      },
      "警語": {
        "x": 110,
        "y": 237,
        "width": 101,
        "height": 9,
        "centerX": 160.5,
        "centerY": 241.5,
        "hidden": false,
        "fontSizePx": 9.13,
        "fontSizePt": 9.13,
        "lineHeight": 10.96,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 38,
        "y": 253,
        "width": 244,
        "height": 215,
        "centerX": 160,
        "centerY": 360.5
      },
      "P_01": {
        "x": 38,
        "y": 253,
        "width": 244,
        "height": 215,
        "centerX": 160,
        "centerY": 360.5,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "P_02": {
        "x": 39,
        "y": 254,
        "width": 200,
        "height": 154,
        "centerX": 139,
        "centerY": 331,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 243,
        "y": 249,
        "width": 62,
        "height": 52,
        "centerX": 274,
        "centerY": 275,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 19,
        "y": 240,
        "width": 120,
        "height": 75,
        "centerX": 79,
        "centerY": 277.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 480,
        "centerX": 160,
        "centerY": 240,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 111.78,
        "y": 332.12,
        "width": 158,
        "height": 57,
        "centerX": 190.78,
        "centerY": 360.62,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 63,
        "fontSizePt": 63,
        "lineHeight": 68.03,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_336x280|banner8": {
    "sourceFile": "Appier_banner8_336x280_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 125,
        "y": 9,
        "width": 87,
        "height": 20,
        "centerX": 168.5,
        "centerY": 19,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 60,
        "y": 34,
        "width": 216,
        "height": 30,
        "centerX": 168,
        "centerY": 49,
        "hidden": false
      },
      "副標題": {
        "x": 69.5,
        "y": 79,
        "width": 198,
        "height": 20,
        "centerX": 168.5,
        "centerY": 89,
        "hidden": false,
        "fontSizePx": 19.66,
        "fontSizePt": 19.66,
        "lineHeight": 23.59,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 68,
        "y": 75,
        "width": 65,
        "height": 23,
        "centerX": 100.5,
        "centerY": 86.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 135,
        "y": 82,
        "width": 133,
        "height": 16,
        "centerX": 201.5,
        "centerY": 90,
        "hidden": true,
        "fontSizePx": 16,
        "fontSizePt": 16,
        "lineHeight": 19.2,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 60.5,
        "y": 71,
        "width": 216,
        "height": 36,
        "centerX": 168.5,
        "centerY": 89,
        "hidden": false
      },
      "警語": {
        "x": 118,
        "y": 110,
        "width": 99,
        "height": 9,
        "centerX": 167.5,
        "centerY": 114.5,
        "hidden": false,
        "fontSizePx": 9,
        "fontSizePt": 9,
        "lineHeight": 10.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 82,
        "y": 124,
        "width": 172,
        "height": 150,
        "centerX": 168,
        "centerY": 199
      },
      "P": {
        "x": 41,
        "y": 125,
        "width": 255,
        "height": 137,
        "centerX": 168.5,
        "centerY": 193.5,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 163,
        "y": 158,
        "width": 98,
        "height": 98,
        "centerX": 212,
        "centerY": 207,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 55,
        "y": 124,
        "width": 156,
        "height": 122,
        "centerX": 133,
        "centerY": 185,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 268,
        "y": 119,
        "width": 49,
        "height": 41,
        "centerX": 292.5,
        "centerY": 139.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 19.1,
        "y": 85.9,
        "width": 85,
        "height": 67.1,
        "centerX": 61.6,
        "centerY": 119.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 336,
        "height": 280,
        "centerX": 168,
        "centerY": 140,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 118.17,
        "y": 163.64,
        "width": 165,
        "height": 60,
        "centerX": 200.67,
        "centerY": 193.64,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 65.83,
        "fontSizePt": 65.83,
        "lineHeight": 71.1,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_480x320|banner8": {
    "sourceFile": "Appier_banner8_480x320_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 186,
        "y": 9,
        "width": 109,
        "height": 26,
        "centerX": 240.5,
        "centerY": 22,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 107,
        "y": 41,
        "width": 266,
        "height": 37,
        "centerX": 240,
        "centerY": 59.5,
        "hidden": false
      },
      "副標題": {
        "x": 117,
        "y": 96,
        "width": 247,
        "height": 24,
        "centerX": 240.5,
        "centerY": 108,
        "hidden": false,
        "fontSizePx": 24.59,
        "fontSizePt": 24.59,
        "lineHeight": 29.51,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 115,
        "y": 90,
        "width": 82,
        "height": 29,
        "centerX": 156,
        "centerY": 104.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 199,
        "y": 99,
        "width": 166,
        "height": 20,
        "centerX": 282,
        "centerY": 109,
        "hidden": true,
        "fontSizePx": 20,
        "fontSizePt": 20,
        "lineHeight": 24,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 107.5,
        "y": 85,
        "width": 266,
        "height": 45,
        "centerX": 240.5,
        "centerY": 107.5,
        "hidden": false
      },
      "警語": {
        "x": 179,
        "y": 133,
        "width": 123,
        "height": 11,
        "centerX": 240.5,
        "centerY": 138.5,
        "hidden": false,
        "fontSizePx": 11.2,
        "fontSizePt": 11.2,
        "lineHeight": 13.44,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 149,
        "y": 149,
        "width": 184,
        "height": 161,
        "centerX": 241,
        "centerY": 229.5
      },
      "P": {
        "x": 102,
        "y": 150,
        "width": 277,
        "height": 150,
        "centerX": 240.5,
        "centerY": 225,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 237,
        "y": 180,
        "width": 112,
        "height": 110,
        "centerX": 293,
        "centerY": 235,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 102,
        "y": 147,
        "width": 191,
        "height": 148,
        "centerX": 197.5,
        "centerY": 221,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 353,
        "y": 137,
        "width": 68,
        "height": 56,
        "centerX": 387,
        "centerY": 165,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 43.3,
        "y": 122.5,
        "width": 101,
        "height": 79.7,
        "centerX": 93.8,
        "centerY": 162.3,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 480,
        "height": 320,
        "centerX": 240,
        "centerY": 160,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 185.44,
        "y": 193.15,
        "width": 180,
        "height": 64,
        "centerX": 275.44,
        "centerY": 225.15,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 71.51,
        "fontSizePt": 71.51,
        "lineHeight": 77.22,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_600x1200|banner8": {
    "sourceFile": "Appier_banner8_600x1200_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 123,
        "y": 136,
        "width": 354,
        "height": 375,
        "centerX": 300,
        "centerY": 323.5,
        "hidden": false
      },
      "副標題": {
        "x": 84,
        "y": 543,
        "width": 432,
        "height": 41,
        "centerX": 300,
        "centerY": 563.5,
        "hidden": false,
        "fontSizePx": 43,
        "fontSizePt": 43,
        "lineHeight": 51.6,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 81,
        "y": 533,
        "width": 143,
        "height": 50,
        "centerX": 152.5,
        "centerY": 558,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 228,
        "y": 549,
        "width": 291,
        "height": 34,
        "centerX": 373.5,
        "centerY": 566,
        "hidden": true,
        "fontSizePx": 35,
        "fontSizePt": 35,
        "lineHeight": 42,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 57,
        "y": 523,
        "width": 486,
        "height": 80,
        "centerX": 300,
        "centerY": 563,
        "hidden": false
      },
      "警語": {
        "x": 185,
        "y": 608,
        "width": 230,
        "height": 20,
        "centerX": 300,
        "centerY": 618,
        "hidden": false,
        "fontSizePx": 21,
        "fontSizePt": 21,
        "lineHeight": 25.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 51,
        "y": 645,
        "width": 500,
        "height": 438,
        "centerX": 301,
        "centerY": 864
      },
      "P": {
        "x": 15,
        "y": 719,
        "width": 571,
        "height": 310,
        "centerX": 300.5,
        "centerY": 874,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 275,
        "y": 790,
        "width": 268,
        "height": 267,
        "centerX": 409,
        "centerY": 923.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 28,
        "y": 660,
        "width": 432,
        "height": 336,
        "centerX": 244,
        "centerY": 828,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 480,
        "y": 673,
        "width": 82,
        "height": 69,
        "centerX": 521,
        "centerY": 707.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 55,
        "y": 632,
        "width": 220,
        "height": 149,
        "centerX": 165,
        "centerY": 706.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 600,
        "height": 1200,
        "centerX": 300,
        "centerY": 600,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 187.52,
        "y": 807.82,
        "width": 370,
        "height": 133,
        "centerX": 372.52,
        "centerY": 874.32,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 147.41,
        "fontSizePt": 147.41,
        "lineHeight": 159.2,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_600x500|banner8": {
    "sourceFile": "Appier_banner8_600x500_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 236,
        "y": 31,
        "width": 133,
        "height": 30,
        "centerX": 302.5,
        "centerY": 46,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 136,
        "y": 71,
        "width": 330,
        "height": 46,
        "centerX": 301,
        "centerY": 94,
        "hidden": false
      },
      "副標題": {
        "x": 151,
        "y": 138,
        "width": 299,
        "height": 29,
        "centerX": 300.5,
        "centerY": 152.5,
        "hidden": false,
        "fontSizePx": 29.76,
        "fontSizePt": 29.76,
        "lineHeight": 35.71,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 149,
        "y": 131,
        "width": 99,
        "height": 35,
        "centerX": 198.5,
        "centerY": 148.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 250,
        "y": 142,
        "width": 202,
        "height": 24,
        "centerX": 351,
        "centerY": 154,
        "hidden": true,
        "fontSizePx": 24.22,
        "fontSizePt": 24.22,
        "lineHeight": 29.06,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 135.5,
        "y": 125,
        "width": 330,
        "height": 55,
        "centerX": 300.5,
        "centerY": 152.5,
        "hidden": false
      },
      "警語": {
        "x": 221,
        "y": 183,
        "width": 159,
        "height": 14,
        "centerX": 300.5,
        "centerY": 190,
        "hidden": false,
        "fontSizePx": 14.5,
        "fontSizePt": 14.5,
        "lineHeight": 17.4,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 144,
        "y": 208,
        "width": 313,
        "height": 275,
        "centerX": 300.5,
        "centerY": 345.5
      },
      "P": {
        "x": 73,
        "y": 222,
        "width": 453,
        "height": 246,
        "centerX": 299.5,
        "centerY": 345,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 266,
        "y": 272,
        "width": 187,
        "height": 186,
        "centerX": 359.5,
        "centerY": 365,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 68,
        "y": 208,
        "width": 297,
        "height": 231,
        "centerX": 216.5,
        "centerY": 323.5,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 428,
        "y": 204,
        "width": 79,
        "height": 66,
        "centerX": 467.5,
        "centerY": 237,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 84,
        "y": 200,
        "width": 155,
        "height": 106,
        "centerX": 161.5,
        "centerY": 253,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 600,
        "height": 500,
        "centerX": 300,
        "centerY": 250,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 209.65,
        "y": 292.75,
        "width": 294,
        "height": 105,
        "centerX": 356.65,
        "centerY": 345.25,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 116.96,
        "fontSizePt": 116.96,
        "lineHeight": 126.32,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_640x200|banner8": {
    "sourceFile": "Appier_banner8_640x200_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 116,
        "y": 29,
        "width": 107,
        "height": 25,
        "centerX": 169.5,
        "centerY": 41.5,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 41,
        "y": 59,
        "width": 258,
        "height": 36,
        "centerX": 170,
        "centerY": 77,
        "hidden": false
      },
      "副標題": {
        "x": 48.5,
        "y": 115,
        "width": 242,
        "height": 23,
        "centerX": 169.5,
        "centerY": 126.5,
        "hidden": false,
        "fontSizePx": 24.05,
        "fontSizePt": 24.05,
        "lineHeight": 28.86,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 48,
        "y": 109,
        "width": 80,
        "height": 28,
        "centerX": 88,
        "centerY": 123,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 130,
        "y": 118,
        "width": 162,
        "height": 19,
        "centerX": 211,
        "centerY": 127.5,
        "hidden": true,
        "fontSizePx": 19.56,
        "fontSizePt": 19.56,
        "lineHeight": 23.47,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 40.5,
        "y": 104,
        "width": 258,
        "height": 44,
        "centerX": 169.5,
        "centerY": 126,
        "hidden": false
      },
      "警語": {
        "x": 110,
        "y": 151,
        "width": 120,
        "height": 11,
        "centerX": 170,
        "centerY": 156.5,
        "hidden": false,
        "fontSizePx": 11,
        "fontSizePt": 11,
        "lineHeight": 13.2,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 351,
        "y": 5,
        "width": 218,
        "height": 191,
        "centerX": 460,
        "centerY": 100.5
      },
      "P": {
        "x": 324,
        "y": 29,
        "width": 259,
        "height": 140,
        "centerX": 453.5,
        "centerY": 99,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 460,
        "y": 56,
        "width": 112,
        "height": 113,
        "centerX": 516,
        "centerY": 112.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 323,
        "y": 5,
        "width": 195,
        "height": 151,
        "centerX": 420.5,
        "centerY": 80.5,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 559,
        "y": 11,
        "width": 61,
        "height": 46,
        "centerX": 589.5,
        "centerY": 34,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 315,
        "y": 13,
        "width": 92,
        "height": 58,
        "centerX": 361,
        "centerY": 42,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 640,
        "height": 200,
        "centerX": 320,
        "centerY": 100,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 402.17,
        "y": 68.64,
        "width": 168,
        "height": 61,
        "centerX": 486.17,
        "centerY": 99.14,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 66.87,
        "fontSizePt": 66.87,
        "lineHeight": 72.22,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_640x960|banner8": {
    "sourceFile": "Appier_banner8_640x960_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 154,
        "y": 63,
        "width": 333,
        "height": 351,
        "centerX": 320.5,
        "centerY": 238.5,
        "hidden": false
      },
      "副標題": {
        "x": 115.5,
        "y": 444,
        "width": 408,
        "height": 39,
        "centerX": 319.5,
        "centerY": 463.5,
        "hidden": false,
        "fontSizePx": 40.57,
        "fontSizePt": 40.57,
        "lineHeight": 48.68,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 114,
        "y": 435,
        "width": 135,
        "height": 47,
        "centerX": 181.5,
        "centerY": 458.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 253,
        "y": 450,
        "width": 274,
        "height": 32,
        "centerX": 390,
        "centerY": 466,
        "hidden": true,
        "fontSizePx": 33,
        "fontSizePt": 33,
        "lineHeight": 39.6,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 86.5,
        "y": 426,
        "width": 466,
        "height": 75,
        "centerX": 319.5,
        "centerY": 463.5,
        "hidden": false
      },
      "警語": {
        "x": 217,
        "y": 506,
        "width": 207,
        "height": 18,
        "centerX": 320.5,
        "centerY": 515,
        "hidden": false,
        "fontSizePx": 19,
        "fontSizePt": 19,
        "lineHeight": 22.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 104,
        "y": 544,
        "width": 431,
        "height": 380,
        "centerX": 319.5,
        "centerY": 734
      },
      "P": {
        "x": 34,
        "y": 544,
        "width": 573,
        "height": 310,
        "centerX": 320.5,
        "centerY": 699,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 297,
        "y": 659,
        "width": 240,
        "height": 239,
        "centerX": 417,
        "centerY": 778.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 40,
        "y": 544,
        "width": 387,
        "height": 300,
        "centerX": 233.5,
        "centerY": 694,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 490,
        "y": 526.8,
        "width": 121,
        "height": 85.4,
        "centerX": 550.5,
        "centerY": 569.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 53,
        "y": 526,
        "width": 220,
        "height": 149,
        "centerX": 163,
        "centerY": 600.5,
        "hidden": true,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 640,
        "height": 960,
        "centerX": 320,
        "centerY": 480,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 207.28,
        "y": 632.8,
        "width": 371,
        "height": 133,
        "centerX": 392.78,
        "centerY": 699.3,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 147.94,
        "fontSizePt": 147.94,
        "lineHeight": 159.77,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_970x250|banner8": {
    "sourceFile": "Appier_banner8_970x250_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 206,
        "y": 24,
        "width": 163,
        "height": 37,
        "centerX": 287.5,
        "centerY": 42.5,
        "hidden": false
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 95,
        "y": 67,
        "width": 384,
        "height": 53,
        "centerX": 287,
        "centerY": 93.5,
        "hidden": false
      },
      "副標題": {
        "x": 108.5,
        "y": 144,
        "width": 357,
        "height": 34,
        "centerX": 287,
        "centerY": 161,
        "hidden": false,
        "fontSizePx": 35.5,
        "fontSizePt": 35.5,
        "lineHeight": 42.6,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "蝦皮VIP_LOGO": {
        "x": 107,
        "y": 136,
        "width": 118,
        "height": 42,
        "centerX": 166,
        "centerY": 157,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 228,
        "y": 149,
        "width": 239,
        "height": 28,
        "centerX": 347.5,
        "centerY": 163,
        "hidden": true,
        "fontSizePx": 28.87,
        "fontSizePt": 28.87,
        "lineHeight": 34.64,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 95,
        "y": 128,
        "width": 384,
        "height": 65,
        "centerX": 287,
        "centerY": 160.5,
        "hidden": false
      },
      "警語": {
        "x": 197,
        "y": 198,
        "width": 180,
        "height": 16,
        "centerX": 287,
        "centerY": 206,
        "hidden": false,
        "fontSizePx": 16.5,
        "fontSizePt": 16.5,
        "lineHeight": 19.8,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_範圍": {
        "x": 571,
        "y": 5,
        "width": 273,
        "height": 240,
        "centerX": 707.5,
        "centerY": 125
      },
      "P": {
        "x": 533,
        "y": 24,
        "width": 333,
        "height": 180,
        "centerX": 699.5,
        "centerY": 114,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 705,
        "y": 70,
        "width": 138,
        "height": 136,
        "centerX": 774,
        "centerY": 138,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 559,
        "y": 9,
        "width": 216,
        "height": 168,
        "centerX": 667,
        "centerY": 93,
        "hidden": true,
        "locked": false
      },
      "DECO_錢幣_右上": {
        "x": 837,
        "y": 36,
        "width": 85,
        "height": 66,
        "centerX": 879.5,
        "centerY": 69,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "DECO_券_左上": {
        "x": 478.6,
        "y": 5.2,
        "width": 122,
        "height": 96.3,
        "centerX": 539.6,
        "centerY": 53.4,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "Appier",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 970,
        "height": 250,
        "centerX": 485,
        "centerY": 125,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 633.5,
        "y": 75.68,
        "width": 216,
        "height": 77,
        "centerX": 741.5,
        "centerY": 114.18,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 85.98,
        "fontSizePt": 85.98,
        "lineHeight": 92.86,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "FB_Linelap_1200x1200|banner7": {
    "sourceFile": "FB_Linelap_banner7_1200x1200_edited.json",
    "layers": {
      "橫式_25號商城狂購節_LOGO_黃字對外": {
        "x": 171,
        "y": 138,
        "width": 858,
        "height": 201,
        "centerX": 600,
        "centerY": 238.5,
        "hidden": false
      },
      "蝦皮VIP_LOGO": {
        "x": 259,
        "y": 379,
        "width": 224,
        "height": 79,
        "centerX": 371,
        "centerY": 418.5,
        "hidden": true
      },
      "蝦皮VIP_副標題_右": {
        "x": 489,
        "y": 404,
        "width": 454,
        "height": 52,
        "centerX": 716,
        "centerY": 430,
        "hidden": true,
        "fontSizePx": 54.74,
        "fontSizePt": 54.74,
        "lineHeight": 65.69,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題": {
        "x": 210.5,
        "y": 390,
        "width": 780,
        "height": 76,
        "centerX": 600.5,
        "centerY": 428,
        "hidden": false,
        "fontSizePx": 79.12,
        "fontSizePt": 79.12,
        "lineHeight": 94.94,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 171.5,
        "y": 364,
        "width": 858,
        "height": 127,
        "centerX": 600.5,
        "centerY": 427.5,
        "hidden": false
      },
      "警語": {
        "x": 381,
        "y": 510,
        "width": 440,
        "height": 35,
        "centerX": 601,
        "centerY": 527.5,
        "hidden": false,
        "fontSizePx": 37,
        "fontSizePt": 37,
        "lineHeight": 44.4,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "DECO_券": {
        "x": 748.7,
        "y": 456.2,
        "width": 430,
        "height": 271,
        "centerX": 963.7,
        "centerY": 591.7,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券.png",
        "assetCandidates": [
          "DECO_券.jpg",
          "DECO_券.jpeg",
          "DECO_券.svg",
          "DECO_券.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "DECO_錢幣": {
        "x": 122,
        "y": 919,
        "width": 309,
        "height": 239,
        "centerX": 276.5,
        "centerY": 1038.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣.png",
        "assetCandidates": [
          "DECO_錢幣.jpg",
          "DECO_錢幣.jpeg",
          "DECO_錢幣.svg",
          "DECO_錢幣.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "P_範圍": {
        "x": 253,
        "y": 565,
        "width": 695,
        "height": 613,
        "centerX": 600.5,
        "centerY": 871.5
      },
      "P_01": {
        "x": 575,
        "y": 666,
        "width": 339,
        "height": 463,
        "centerX": 744.5,
        "centerY": 897.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 365,
        "y": 564,
        "width": 221,
        "height": 577,
        "centerX": 475.5,
        "centerY": 852.5,
        "hidden": true,
        "locked": false
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818,
        "hidden": false,
        "locked": false
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1200,
        "height": 1200,
        "centerX": 600,
        "centerY": 600,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 410.5,
        "y": 707.8,
        "width": 582,
        "height": 226,
        "centerX": 701.5,
        "centerY": 820.8,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 251.23,
        "fontSizePt": 251.23,
        "lineHeight": 271.33,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "FB_Linelap_1200x628|banner7": {
    "sourceFile": "FB_Linelap_banner7_1200x628_edited.json",
    "layers": {
      "橫式_25號商城狂購節_LOGO_黃字對外": {
        "x": 55,
        "y": 136,
        "width": 694,
        "height": 163,
        "centerX": 402,
        "centerY": 217.5,
        "hidden": false
      },
      "蝦皮VIP_LOGO": {
        "x": 131,
        "y": 343,
        "width": 177,
        "height": 62,
        "centerX": 219.5,
        "centerY": 374,
        "hidden": true
      },
      "蝦皮VIP_副標題_右": {
        "x": 312,
        "y": 363,
        "width": 358,
        "height": 42,
        "centerX": 491,
        "centerY": 384,
        "hidden": true,
        "fontSizePx": 43.2,
        "fontSizePt": 43.2,
        "lineHeight": 51.84,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題": {
        "x": 55.5,
        "y": 349,
        "width": 690,
        "height": 67,
        "centerX": 400.5,
        "centerY": 382.5,
        "hidden": false,
        "fontSizePx": 70,
        "fontSizePt": 70,
        "lineHeight": 84,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 30.5,
        "y": 326,
        "width": 740,
        "height": 112,
        "centerX": 400.5,
        "centerY": 382,
        "hidden": false
      },
      "警語": {
        "x": 193,
        "y": 447,
        "width": 416,
        "height": 33,
        "centerX": 401,
        "centerY": 463.5,
        "hidden": false,
        "fontSizePx": 35,
        "fontSizePt": 35,
        "lineHeight": 42,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_01": {
        "x": 934.14,
        "y": 199.65,
        "width": 226.42,
        "height": 308.5,
        "centerX": 1047.35,
        "centerY": 353.9,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 797.35,
        "y": 131.73,
        "width": 146.23,
        "height": 383.03,
        "centerX": 870.46,
        "centerY": 323.24,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_範圍": {
        "x": 713.4,
        "y": 98.7,
        "width": 481.1,
        "height": 423.6,
        "centerX": 954,
        "centerY": 310.5
      },
      "P": {
        "x": 781.31,
        "y": 256.26,
        "width": 383.03,
        "height": 177.36,
        "centerX": 972.82,
        "centerY": 344.94,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_券_左上": {
        "x": 837,
        "y": 112,
        "width": 172,
        "height": 136,
        "centerX": 923,
        "centerY": 180,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "DECO_錢幣_右上": {
        "x": 1040,
        "y": 168,
        "width": 122,
        "height": 93,
        "centerX": 1101,
        "centerY": 214.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1200,
        "height": 628,
        "centerX": 600,
        "centerY": 314,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 901.18,
        "y": 298.44,
        "width": 243,
        "height": 95,
        "centerX": 1022.68,
        "centerY": 345.94,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 104.81,
        "fontSizePt": 104.81,
        "lineHeight": 113.2,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "FB_Linelap_960x1200|banner7": {
    "sourceFile": "FB_Linelap_banner7_960x1200_edited.json",
    "layers": {
      "橫式_25號商城狂購節_LOGO_黃字對外": {
        "x": 96,
        "y": 160,
        "width": 767,
        "height": 179,
        "centerX": 479.5,
        "centerY": 249.5,
        "hidden": false
      },
      "蝦皮VIP_LOGO": {
        "x": 148,
        "y": 379,
        "width": 224,
        "height": 79,
        "centerX": 260,
        "centerY": 418.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 380,
        "y": 404,
        "width": 432,
        "height": 53,
        "centerX": 596,
        "centerY": 430.5,
        "hidden": true,
        "fontSizePx": 54.74,
        "fontSizePt": 54.74,
        "lineHeight": 64.77716827392578,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題": {
        "x": 125.5,
        "y": 386,
        "width": 710,
        "height": 70,
        "centerX": 480.5,
        "centerY": 421,
        "hidden": false,
        "fontSizePx": 72,
        "fontSizePt": 72,
        "lineHeight": 86.4,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 97,
        "y": 364,
        "width": 767,
        "height": 114,
        "centerX": 480.5,
        "centerY": 421,
        "hidden": false
      },
      "警語": {
        "x": 248,
        "y": 494,
        "width": 463,
        "height": 32,
        "centerX": 479.5,
        "centerY": 510,
        "hidden": false,
        "fontSizePx": 33.35,
        "fontSizePt": 33.35,
        "lineHeight": 40.02,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "DECO_錢幣": {
        "x": 125,
        "y": 903,
        "width": 309,
        "height": 240,
        "centerX": 279.5,
        "centerY": 1023,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣.png",
        "assetCandidates": [
          "DECO_錢幣.jpg",
          "DECO_錢幣.jpeg",
          "DECO_錢幣.svg",
          "DECO_錢幣.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "DECO_券": {
        "x": 563,
        "y": 464,
        "width": 405.7,
        "height": 255.7,
        "centerX": 765.9,
        "centerY": 591.9,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券.png",
        "assetCandidates": [
          "DECO_券.jpg",
          "DECO_券.jpeg",
          "DECO_券.svg",
          "DECO_券.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "P_範圍": {
        "x": 121,
        "y": 546,
        "width": 719,
        "height": 633,
        "centerX": 480.5,
        "centerY": 862.5
      },
      "P": {
        "x": 59,
        "y": 584,
        "width": 820,
        "height": 442,
        "centerX": 469,
        "centerY": 805,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 460,
        "y": 650,
        "width": 311,
        "height": 423,
        "centerX": 615.5,
        "centerY": 861.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 269,
        "y": 557,
        "width": 202,
        "height": 527,
        "centerX": 370,
        "centerY": 820.5,
        "hidden": true,
        "locked": false
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 960,
        "height": 1200,
        "centerX": 480,
        "centerY": 600,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 315.74,
        "y": 706.51,
        "width": 520,
        "height": 202,
        "centerX": 575.74,
        "centerY": 807.51,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 224.4,
        "fontSizePt": 224.4,
        "lineHeight": 242.36,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "FB_Linelap_1200x1200|banner8": {
    "sourceFile": "FB_Linelap_banner8_1200x1200_edited.json",
    "layers": {
      "橫式_25號商城狂購節_LOGO_黃字對外": {
        "x": 171,
        "y": 138,
        "width": 858,
        "height": 201,
        "centerX": 600,
        "centerY": 238.5,
        "hidden": false
      },
      "蝦皮VIP_LOGO": {
        "x": 259,
        "y": 379,
        "width": 224,
        "height": 79,
        "centerX": 371,
        "centerY": 418.5,
        "hidden": true
      },
      "蝦皮VIP_副標題_右": {
        "x": 489,
        "y": 404,
        "width": 454,
        "height": 52,
        "centerX": 716,
        "centerY": 430,
        "hidden": true,
        "fontSizePx": 54.74,
        "fontSizePt": 54.74,
        "lineHeight": 65.69,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題": {
        "x": 203,
        "y": 390,
        "width": 795,
        "height": 76,
        "centerX": 600.5,
        "centerY": 428,
        "hidden": false,
        "fontSizePx": 79.12,
        "fontSizePt": 79.12,
        "lineHeight": 94.94,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 171.5,
        "y": 364,
        "width": 858,
        "height": 127,
        "centerX": 600.5,
        "centerY": 427.5,
        "hidden": false
      },
      "警語": {
        "x": 381,
        "y": 510,
        "width": 440,
        "height": 35,
        "centerX": 601,
        "centerY": 527.5,
        "hidden": false,
        "fontSizePx": 37,
        "fontSizePt": 37,
        "lineHeight": 44.4,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "DECO_券": {
        "x": 736.3,
        "y": 450.9,
        "width": 430,
        "height": 271,
        "centerX": 951.3,
        "centerY": 586.4,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券.png",
        "assetCandidates": [
          "DECO_券.jpg",
          "DECO_券.jpeg",
          "DECO_券.svg",
          "DECO_券.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "DECO_錢幣": {
        "x": 122,
        "y": 919,
        "width": 309,
        "height": 239,
        "centerX": 276.5,
        "centerY": 1038.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣.png",
        "assetCandidates": [
          "DECO_錢幣.jpg",
          "DECO_錢幣.jpeg",
          "DECO_錢幣.svg",
          "DECO_錢幣.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "P_範圍": {
        "x": 253,
        "y": 565,
        "width": 695,
        "height": 613,
        "centerX": 600.5,
        "centerY": 871.5
      },
      "P_01": {
        "x": 575,
        "y": 666,
        "width": 339,
        "height": 463,
        "centerX": 744.5,
        "centerY": 897.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 365,
        "y": 564,
        "width": 221,
        "height": 577,
        "centerX": 475.5,
        "centerY": 852.5,
        "hidden": true,
        "locked": false
      },
      "P": {
        "x": 123,
        "y": 571,
        "width": 918,
        "height": 494,
        "centerX": 582,
        "centerY": 818,
        "hidden": false,
        "locked": false
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1200,
        "height": 1200,
        "centerX": 600,
        "centerY": 600,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 400.8,
        "y": 712,
        "width": 594,
        "height": 213,
        "centerX": 697.8,
        "centerY": 818.5,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 237.01,
        "fontSizePt": 237.01,
        "lineHeight": 255.97,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "FB_Linelap_1200x628|banner8": {
    "sourceFile": "FB_Linelap_banner8_1200x628_edited.json",
    "layers": {
      "橫式_25號商城狂購節_LOGO_黃字對外": {
        "x": 55,
        "y": 136,
        "width": 694,
        "height": 163,
        "centerX": 402,
        "centerY": 217.5,
        "hidden": false
      },
      "蝦皮VIP_LOGO": {
        "x": 131,
        "y": 343,
        "width": 177,
        "height": 62,
        "centerX": 219.5,
        "centerY": 374,
        "hidden": true
      },
      "蝦皮VIP_副標題_右": {
        "x": 312,
        "y": 363,
        "width": 358,
        "height": 42,
        "centerX": 491,
        "centerY": 384,
        "hidden": true,
        "fontSizePx": 43.2,
        "fontSizePt": 43.2,
        "lineHeight": 51.84,
        "letterSpacing": 0,
        "align": "left",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題": {
        "x": 48.5,
        "y": 349,
        "width": 704,
        "height": 67,
        "centerX": 400.5,
        "centerY": 382.5,
        "hidden": false,
        "fontSizePx": 70,
        "fontSizePt": 70,
        "lineHeight": 84,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 23.5,
        "y": 326,
        "width": 754,
        "height": 112,
        "centerX": 400.5,
        "centerY": 382,
        "hidden": false
      },
      "警語": {
        "x": 193,
        "y": 447,
        "width": 416,
        "height": 33,
        "centerX": 401,
        "centerY": 463.5,
        "hidden": false,
        "fontSizePx": 35,
        "fontSizePt": 35,
        "lineHeight": 42,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "P_01": {
        "x": 936.54,
        "y": 196.55,
        "width": 226.42,
        "height": 308.5,
        "centerX": 1049.75,
        "centerY": 350.8,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 799.74,
        "y": 128.63,
        "width": 146.23,
        "height": 383.03,
        "centerX": 872.86,
        "centerY": 320.14,
        "rotation": 0,
        "hidden": true,
        "locked": false
      },
      "P_範圍": {
        "x": 715.8,
        "y": 95.6,
        "width": 481.1,
        "height": 423.6,
        "centerX": 956.3,
        "centerY": 307.4
      },
      "P": {
        "x": 783.71,
        "y": 253.16,
        "width": 383.03,
        "height": 177.36,
        "centerX": 975.22,
        "centerY": 341.84,
        "rotation": 0,
        "hidden": false,
        "locked": false
      },
      "DECO_券_左上": {
        "x": 837,
        "y": 112,
        "width": 172,
        "height": 136,
        "centerX": 923,
        "centerY": 180,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券_左上.png",
        "assetCandidates": [
          "DECO_券_左上.jpg",
          "DECO_券_左上.jpeg",
          "DECO_券_左上.svg",
          "DECO_券_左上.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "DECO_錢幣_右上": {
        "x": 1040,
        "y": 168,
        "width": 122,
        "height": 93,
        "centerX": 1101,
        "centerY": 214.5,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣_右上.png",
        "assetCandidates": [
          "DECO_錢幣_右上.jpg",
          "DECO_錢幣_右上.jpeg",
          "DECO_錢幣_右上.svg",
          "DECO_錢幣_右上.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 1200,
        "height": 628,
        "centerX": 600,
        "centerY": 314,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 899.53,
        "y": 297.52,
        "width": 248,
        "height": 89,
        "centerX": 1023.53,
        "centerY": 342.02,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 98.89,
        "fontSizePt": 98.89,
        "lineHeight": 106.8,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "FB_Linelap_960x1200|banner8": {
    "sourceFile": "FB_Linelap_banner8_960x1200_edited.json",
    "layers": {
      "橫式_25號商城狂購節_LOGO_黃字對外": {
        "x": 96,
        "y": 160,
        "width": 767,
        "height": 179,
        "centerX": 479.5,
        "centerY": 249.5,
        "hidden": false
      },
      "蝦皮VIP_LOGO": {
        "x": 148,
        "y": 379,
        "width": 224,
        "height": 79,
        "centerX": 260,
        "centerY": 418.5,
        "hidden": true
      },
      "蝦皮VIP_副標題": {
        "x": 380,
        "y": 404,
        "width": 432,
        "height": 53,
        "centerX": 596,
        "centerY": 430.5,
        "hidden": true,
        "fontSizePx": 54.74,
        "fontSizePt": 54.74,
        "lineHeight": 64.77716827392578,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題": {
        "x": 118.5,
        "y": 386,
        "width": 724,
        "height": 70,
        "centerX": 480.5,
        "centerY": 421,
        "hidden": false,
        "fontSizePx": 72,
        "fontSizePt": 72,
        "lineHeight": 86.4,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFE600",
        "fontWeight": "700",
        "fontStyle": "Bold",
        "italic": false
      },
      "副標題_底色": {
        "x": 97,
        "y": 364,
        "width": 767,
        "height": 114,
        "centerX": 480.5,
        "centerY": 421,
        "hidden": false
      },
      "警語": {
        "x": 248,
        "y": 494,
        "width": 463,
        "height": 32,
        "centerX": 479.5,
        "centerY": 510,
        "hidden": false,
        "fontSizePx": 33.35,
        "fontSizePt": 33.35,
        "lineHeight": 40.02,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FFFFFF",
        "fontWeight": "400",
        "fontStyle": "Regular",
        "italic": false
      },
      "DECO_錢幣": {
        "x": 125,
        "y": 903,
        "width": 309,
        "height": 240,
        "centerX": 279.5,
        "centerY": 1023,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_錢幣.png",
        "assetCandidates": [
          "DECO_錢幣.jpg",
          "DECO_錢幣.jpeg",
          "DECO_錢幣.svg",
          "DECO_錢幣.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "DECO_券": {
        "x": 540.2,
        "y": 459.8,
        "width": 430,
        "height": 271,
        "centerX": 755.2,
        "centerY": 595.3,
        "hidden": false,
        "locked": false,
        "assetFilename": "DECO_券.png",
        "assetCandidates": [
          "DECO_券.jpg",
          "DECO_券.jpeg",
          "DECO_券.svg",
          "DECO_券.webp"
        ],
        "assetProject": "FB_Linelap",
        "keepAspectRatio": true
      },
      "P_範圍": {
        "x": 121,
        "y": 546,
        "width": 719,
        "height": 633,
        "centerX": 480.5,
        "centerY": 862.5
      },
      "P": {
        "x": 59,
        "y": 584,
        "width": 820,
        "height": 442,
        "centerX": 469,
        "centerY": 805,
        "hidden": false,
        "locked": false
      },
      "P_01": {
        "x": 460,
        "y": 650,
        "width": 311,
        "height": 423,
        "centerX": 615.5,
        "centerY": 861.5,
        "hidden": true,
        "locked": false
      },
      "P_02": {
        "x": 269,
        "y": 557,
        "width": 202,
        "height": 527,
        "centerX": 370,
        "centerY": 820.5,
        "hidden": true,
        "locked": false
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 960,
        "height": 1200,
        "centerX": 480,
        "centerY": 600,
        "hidden": false,
        "locked": true
      },
      "__auto_price_v2_single": {
        "x": 306.94,
        "y": 710.45,
        "width": 531,
        "height": 190,
        "centerX": 572.44,
        "centerY": 805.45,
        "rotation": 5,
        "hidden": false,
        "locked": false,
        "fontSizePx": 211.7,
        "fontSizePt": 211.7,
        "lineHeight": 228.64,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_320x50|banner1": {
    "sourceFile": "Appier_banner1_320x50_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 53,
        "y": 10,
        "width": 54,
        "height": 12,
        "centerX": 80,
        "centerY": 16
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 17,
        "y": 25,
        "width": 126,
        "height": 18,
        "centerX": 80,
        "centerY": 34
      },
      "副標題": {
        "x": 232,
        "y": 17,
        "width": 61,
        "height": 10,
        "centerX": 262.5,
        "centerY": 22
      },
      "蝦皮VIP_LOGO": {
        "x": 214,
        "y": 16,
        "width": 30,
        "height": 11,
        "centerX": 229,
        "centerY": 21.5
      },
      "蝦皮VIP_副標題": {
        "x": 249,
        "y": 19,
        "width": 62,
        "height": 7,
        "centerX": 280,
        "centerY": 22.5
      },
      "副標題_底色": {
        "x": 204,
        "y": 13,
        "width": 117,
        "height": 18,
        "centerX": 262.5,
        "centerY": 22
      },
      "警語": {
        "x": 239,
        "y": 31,
        "width": 47,
        "height": 5,
        "centerX": 262.5,
        "centerY": 33.5
      },
      "P_範圍": {
        "x": 150,
        "y": -1,
        "width": 58,
        "height": 52,
        "centerX": 179,
        "centerY": 25
      },
      "P": {
        "x": 148,
        "y": 9,
        "width": 62,
        "height": 33,
        "centerX": 179,
        "centerY": 25.5
      },
      "P_01": {
        "x": 181,
        "y": 14,
        "width": 32,
        "height": 32,
        "centerX": 197,
        "centerY": 30
      },
      "P_02": {
        "x": 147,
        "y": 4,
        "width": 49,
        "height": 38,
        "centerX": 171.5,
        "centerY": 23
      },
      "DECO_錢幣_右上": {
        "x": 298,
        "y": 36,
        "width": 22,
        "height": 17,
        "centerX": 309,
        "centerY": 44.5
      },
      "DECO_券_左上": {
        "x": 7,
        "y": 0,
        "width": 41,
        "height": 25,
        "centerX": 27.5,
        "centerY": 12.5
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 50,
        "centerX": 160,
        "centerY": 25
      },
      "__auto_price_v2_single": {
        "x": 167.88,
        "y": 23.75,
        "width": 39,
        "height": 9,
        "centerX": 187.38,
        "centerY": 28.25,
        "rotation": 3.73,
        "hidden": false,
        "locked": false,
        "fontSizePx": 9.23,
        "fontSizePt": 9.23,
        "lineHeight": 9.97,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_640x100|banner1": {
    "sourceFile": "Appier_banner1_640x100_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 106,
        "y": 16,
        "width": 108,
        "height": 25,
        "centerX": 160,
        "centerY": 28.5
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 29,
        "y": 46,
        "width": 258,
        "height": 36,
        "centerX": 158,
        "centerY": 64
      },
      "副標題": {
        "x": 465,
        "y": 34,
        "width": 114,
        "height": 17,
        "centerX": 522,
        "centerY": 42.5
      },
      "蝦皮VIP_LOGO": {
        "x": 433,
        "y": 31,
        "width": 57,
        "height": 20,
        "centerX": 461.5,
        "centerY": 41
      },
      "蝦皮VIP_副標題": {
        "x": 495,
        "y": 37,
        "width": 116,
        "height": 14,
        "centerX": 553,
        "centerY": 44
      },
      "副標題_底色": {
        "x": 393,
        "y": 27,
        "width": 258,
        "height": 32,
        "centerX": 522,
        "centerY": 43
      },
      "警語": {
        "x": 476,
        "y": 61,
        "width": 92,
        "height": 8,
        "centerX": 522,
        "centerY": 65
      },
      "P_範圍": {
        "x": 303,
        "y": -1,
        "width": 116,
        "height": 102,
        "centerX": 361,
        "centerY": 50
      },
      "P": {
        "x": 298,
        "y": 18,
        "width": 121,
        "height": 65,
        "centerX": 358.5,
        "centerY": 50.5
      },
      "P_01": {
        "x": 358,
        "y": 29,
        "width": 65,
        "height": 64,
        "centerX": 390.5,
        "centerY": 61
      },
      "P_02": {
        "x": 293,
        "y": 8,
        "width": 102,
        "height": 79,
        "centerX": 344,
        "centerY": 47.5
      },
      "DECO_錢幣_右上": {
        "x": 590,
        "y": 73,
        "width": 46,
        "height": 34,
        "centerX": 613,
        "centerY": 90
      },
      "DECO_券_左上": {
        "x": 10,
        "y": 5,
        "width": 76,
        "height": 45,
        "centerX": 48,
        "centerY": 27.5
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 640,
        "height": 100,
        "centerX": 320,
        "centerY": 50
      },
      "__auto_price_v2_single": {
        "x": 337.35,
        "y": 46.9,
        "width": 75,
        "height": 18,
        "centerX": 374.85,
        "centerY": 55.9,
        "rotation": 3.73,
        "hidden": false,
        "locked": false,
        "fontSizePx": 18.02,
        "fontSizePt": 18.02,
        "lineHeight": 19.46,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_640x200|banner1": {
    "sourceFile": "Appier_banner1_640x200_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 116,
        "y": 29,
        "width": 107,
        "height": 25,
        "centerX": 169.5,
        "centerY": 41.5
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 41,
        "y": 59,
        "width": 258,
        "height": 36,
        "centerX": 170,
        "centerY": 77
      },
      "副標題": {
        "x": 90,
        "y": 115,
        "width": 159,
        "height": 23,
        "centerX": 169.5,
        "centerY": 126.5
      },
      "蝦皮VIP_LOGO": {
        "x": 45.5,
        "y": 109,
        "width": 80,
        "height": 28,
        "centerX": 85.5,
        "centerY": 123
      },
      "蝦皮VIP_副標題": {
        "x": 130.5,
        "y": 118,
        "width": 163,
        "height": 19,
        "centerX": 212,
        "centerY": 127.5
      },
      "副標題_底色": {
        "x": 40.5,
        "y": 104,
        "width": 258,
        "height": 44,
        "centerX": 169.5,
        "centerY": 126
      },
      "警語": {
        "x": 110,
        "y": 151,
        "width": 120,
        "height": 11,
        "centerX": 170,
        "centerY": 156.5
      },
      "P_範圍": {
        "x": 351,
        "y": 5,
        "width": 218,
        "height": 191,
        "centerX": 460,
        "centerY": 100.5
      },
      "P": {
        "x": 324,
        "y": 29,
        "width": 259,
        "height": 140,
        "centerX": 453.5,
        "centerY": 99
      },
      "P_01": {
        "x": 460,
        "y": 56,
        "width": 112,
        "height": 113,
        "centerX": 516,
        "centerY": 112.5
      },
      "P_02": {
        "x": 323,
        "y": 5,
        "width": 195,
        "height": 151,
        "centerX": 420.5,
        "centerY": 80.5
      },
      "DECO_錢幣_右上": {
        "x": 559,
        "y": 11,
        "width": 61,
        "height": 46,
        "centerX": 589.5,
        "centerY": 34
      },
      "DECO_券_左上": {
        "x": 315,
        "y": 13,
        "width": 92,
        "height": 58,
        "centerX": 361,
        "centerY": 42
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 640,
        "height": 200,
        "centerX": 320,
        "centerY": 100
      },
      "__auto_price_v2_single": {
        "x": 408,
        "y": 92.13,
        "width": 161,
        "height": 37,
        "centerX": 488.5,
        "centerY": 110.63,
        "rotation": 3.73,
        "hidden": false,
        "locked": false,
        "fontSizePx": 38.57,
        "fontSizePt": 38.57,
        "lineHeight": 41.66,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#FF770F",
        "fontWeight": "700"
      }
    }
  },
  "Appier_320x50|banner2": {
    "sourceFile": "Appier_banner2_320x50_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 53,
        "y": 10,
        "width": 54,
        "height": 12,
        "centerX": 80,
        "centerY": 16
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 17,
        "y": 25,
        "width": 126,
        "height": 18,
        "centerX": 80,
        "centerY": 34
      },
      "副標題": {
        "x": 232,
        "y": 17,
        "width": 61,
        "height": 10,
        "centerX": 262.5,
        "centerY": 22
      },
      "蝦皮VIP_LOGO": {
        "x": 216,
        "y": 16,
        "width": 30,
        "height": 11,
        "centerX": 231,
        "centerY": 21.5
      },
      "蝦皮VIP_副標題": {
        "x": 247,
        "y": 19,
        "width": 62,
        "height": 7,
        "centerX": 278,
        "centerY": 22.5
      },
      "副標題_底色": {
        "x": 222,
        "y": 13,
        "width": 81,
        "height": 18,
        "centerX": 262.5,
        "centerY": 22
      },
      "警語": {
        "x": 239,
        "y": 31,
        "width": 47,
        "height": 5,
        "centerX": 262.5,
        "centerY": 33.5
      },
      "P_範圍": {
        "x": 150,
        "y": -1,
        "width": 58,
        "height": 52,
        "centerX": 179,
        "centerY": 25
      },
      "P": {
        "x": 148,
        "y": 9,
        "width": 62,
        "height": 33,
        "centerX": 179,
        "centerY": 25.5,
        "rotation": 0
      },
      "P_01": {
        "x": 181.4,
        "y": 13.7,
        "width": 25.4,
        "height": 34.6,
        "centerX": 194.1,
        "centerY": 31,
        "rotation": 0
      },
      "P_02": {
        "x": 161.9,
        "y": 3.9,
        "width": 17.1,
        "height": 44.8,
        "centerX": 170.5,
        "centerY": 26.3,
        "rotation": 0
      },
      "DECO_錢幣_右上": {
        "x": 298,
        "y": 36,
        "width": 22,
        "height": 17,
        "centerX": 309,
        "centerY": 44.5
      },
      "DECO_券_左上": {
        "x": 7,
        "y": 0,
        "width": 41,
        "height": 25,
        "centerX": 27.5,
        "centerY": 12.5
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 50,
        "centerX": 160,
        "centerY": 25
      }
    }
  },
  "Appier_640x100|banner2": {
    "sourceFile": "Appier_banner2_640x100_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 106,
        "y": 16,
        "width": 108,
        "height": 25,
        "centerX": 160,
        "centerY": 28.5
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 29,
        "y": 46,
        "width": 258,
        "height": 36,
        "centerX": 158,
        "centerY": 64
      },
      "副標題": {
        "x": 464,
        "y": 34,
        "width": 116,
        "height": 17,
        "centerX": 522,
        "centerY": 42.5
      },
      "蝦皮VIP_LOGO": {
        "x": 435,
        "y": 31,
        "width": 57,
        "height": 20,
        "centerX": 463.5,
        "centerY": 41
      },
      "蝦皮VIP_副標題": {
        "x": 494,
        "y": 37,
        "width": 115,
        "height": 14,
        "centerX": 551.5,
        "centerY": 44
      },
      "副標題_底色": {
        "x": 393,
        "y": 27,
        "width": 258,
        "height": 32,
        "centerX": 522,
        "centerY": 43
      },
      "警語": {
        "x": 476,
        "y": 61,
        "width": 92,
        "height": 8,
        "centerX": 522,
        "centerY": 65
      },
      "P_範圍": {
        "x": 303,
        "y": -1,
        "width": 116,
        "height": 102,
        "centerX": 361,
        "centerY": 50
      },
      "P": {
        "x": 298,
        "y": 18,
        "width": 121,
        "height": 65,
        "centerX": 358.5,
        "centerY": 50.5
      },
      "P_01": {
        "x": 359.01,
        "y": 28.36,
        "width": 51.59,
        "height": 69.2,
        "centerX": 384.81,
        "centerY": 62.96,
        "rotation": 0
      },
      "P_02": {
        "x": 324.24,
        "y": 7.4,
        "width": 35.6,
        "height": 93.14,
        "centerX": 342.04,
        "centerY": 53.97,
        "rotation": 0
      },
      "DECO_錢幣_右上": {
        "x": 590,
        "y": 73,
        "width": 46,
        "height": 34,
        "centerX": 613,
        "centerY": 90
      },
      "DECO_券_左上": {
        "x": 10,
        "y": 5,
        "width": 76,
        "height": 45,
        "centerX": 48,
        "centerY": 27.5
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 640,
        "height": 100,
        "centerX": 320,
        "centerY": 50
      }
    }
  },
  "Appier_160x600|banner7": {
    "sourceFile": "Appier_banner7_160x600_edited.json",
    "layers": {
      "直式_25號商城狂購節_LOGO": {
        "x": 16,
        "y": 102,
        "width": 128,
        "height": 136,
        "centerX": 80,
        "centerY": 170
      },
      "副標題_上": {
        "x": 18,
        "y": 255,
        "width": 124,
        "height": 29,
        "centerX": 80,
        "centerY": 269.5
      },
      "副標題_下": {
        "x": 17,
        "y": 294,
        "width": 126,
        "height": 56,
        "centerX": 80,
        "centerY": 322
      },
      "警語": {
        "x": 14,
        "y": 363,
        "width": 131,
        "height": 12,
        "centerX": 79.5,
        "centerY": 369
      },
      "P": {
        "x": 3,
        "y": 410,
        "width": 155,
        "height": 83,
        "centerX": 80.5,
        "centerY": 451.5
      },
      "P_範圍": {
        "x": 2,
        "y": 383,
        "width": 157,
        "height": 139,
        "centerX": 80.5,
        "centerY": 452.5
      },
      "P_01": {
        "x": 72,
        "y": 430,
        "width": 79,
        "height": 79,
        "centerX": 111.5,
        "centerY": 469.5
      },
      "P_02": {
        "x": 4,
        "y": 392,
        "width": 126,
        "height": 98,
        "centerX": 67,
        "centerY": 441
      },
      "DECO_錢幣_右上": {
        "x": 93,
        "y": 535,
        "width": 63,
        "height": 52,
        "centerX": 124.5,
        "centerY": 561
      },
      "DECO_券_左上": {
        "x": 9,
        "y": 10,
        "width": 131,
        "height": 89,
        "centerX": 74.5,
        "centerY": 54.5
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 160,
        "height": 600,
        "centerX": 80,
        "centerY": 300
      },
      "__auto_price_v2_single": {
        "x": 51.47,
        "y": 432.31,
        "width": 99,
        "height": 38,
        "centerX": 100.97,
        "centerY": 451.31,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 42.42,
        "fontSizePt": 42.42,
        "lineHeight": 45.81,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_320x50|banner7": {
    "sourceFile": "Appier_banner7_320x50_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 53,
        "y": 10,
        "width": 54,
        "height": 12,
        "centerX": 80,
        "centerY": 16
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 17,
        "y": 25,
        "width": 126,
        "height": 18,
        "centerX": 80,
        "centerY": 34
      },
      "副標題": {
        "x": 217.5,
        "y": 17,
        "width": 90,
        "height": 10,
        "centerX": 262.5,
        "centerY": 22
      },
      "蝦皮VIP_LOGO": {
        "x": 216,
        "y": 16,
        "width": 30,
        "height": 11,
        "centerX": 231,
        "centerY": 21.5
      },
      "蝦皮VIP_副標題": {
        "x": 247,
        "y": 19,
        "width": 62,
        "height": 7,
        "centerX": 278,
        "centerY": 22.5
      },
      "副標題_底色": {
        "x": 207.5,
        "y": 13,
        "width": 110,
        "height": 18,
        "centerX": 262.5,
        "centerY": 22
      },
      "警語": {
        "x": 239,
        "y": 31,
        "width": 47,
        "height": 5,
        "centerX": 262.5,
        "centerY": 33.5
      },
      "P_範圍": {
        "x": 148.6,
        "y": 0.5,
        "width": 54.7,
        "height": 49.1,
        "centerX": 175.95,
        "centerY": 25.05
      },
      "P": {
        "x": 146.68,
        "y": 9.94,
        "width": 58.54,
        "height": 31.16,
        "centerX": 175.95,
        "centerY": 25.52,
        "rotation": 0
      },
      "P_01": {
        "x": 177.84,
        "y": 14.66,
        "width": 30.22,
        "height": 30.22,
        "centerX": 192.95,
        "centerY": 29.77,
        "rotation": 0
      },
      "P_02": {
        "x": 145.74,
        "y": 5.22,
        "width": 46.27,
        "height": 35.88,
        "centerX": 168.875,
        "centerY": 23.16,
        "rotation": 0
      },
      "DECO_錢幣_右上": {
        "x": 298,
        "y": 36,
        "width": 22,
        "height": 17,
        "centerX": 309,
        "centerY": 44.5
      },
      "DECO_券_左上": {
        "x": 7,
        "y": 0,
        "width": 41,
        "height": 25,
        "centerX": 27.5,
        "centerY": 12.5
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 50,
        "centerX": 160,
        "centerY": 25
      },
      "__auto_price_v2_single": {
        "x": 164.69,
        "y": 17.45,
        "width": 38,
        "height": 16,
        "centerX": 183.69,
        "centerY": 25.45,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 16.02,
        "fontSizePt": 16.02,
        "lineHeight": 17.3,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_336x280|banner7": {
    "sourceFile": "Appier_banner7_336x280_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 125,
        "y": 9,
        "width": 87,
        "height": 20,
        "centerX": 168.5,
        "centerY": 19
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 60,
        "y": 34,
        "width": 216,
        "height": 30,
        "centerX": 168,
        "centerY": 49
      },
      "副標題": {
        "x": 71.5,
        "y": 79,
        "width": 194,
        "height": 20,
        "centerX": 168.5,
        "centerY": 89
      },
      "蝦皮VIP_LOGO": {
        "x": 68,
        "y": 75,
        "width": 65,
        "height": 23,
        "centerX": 100.5,
        "centerY": 86.5
      },
      "蝦皮VIP_副標題": {
        "x": 135,
        "y": 82,
        "width": 133,
        "height": 16,
        "centerX": 201.5,
        "centerY": 90
      },
      "副標題_底色": {
        "x": 60.5,
        "y": 71,
        "width": 216,
        "height": 36,
        "centerX": 168.5,
        "centerY": 89
      },
      "警語": {
        "x": 118,
        "y": 110,
        "width": 99,
        "height": 9,
        "centerX": 167.5,
        "centerY": 114.5
      },
      "P_範圍": {
        "x": 82,
        "y": 124,
        "width": 172,
        "height": 150,
        "centerX": 168,
        "centerY": 199
      },
      "P": {
        "x": 41,
        "y": 125,
        "width": 255,
        "height": 137,
        "centerX": 168.5,
        "centerY": 193.5
      },
      "P_01": {
        "x": 163,
        "y": 158,
        "width": 98,
        "height": 98,
        "centerX": 212,
        "centerY": 207
      },
      "P_02": {
        "x": 55,
        "y": 124,
        "width": 156,
        "height": 122,
        "centerX": 133,
        "centerY": 185
      },
      "DECO_錢幣_右上": {
        "x": 268,
        "y": 119,
        "width": 49,
        "height": 41,
        "centerX": 292.5,
        "centerY": 139.5
      },
      "DECO_券_左上": {
        "x": 48,
        "y": 121,
        "width": 85,
        "height": 58,
        "centerX": 90.5,
        "centerY": 150
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 336,
        "height": 280,
        "centerX": 168,
        "centerY": 140
      },
      "__auto_price_v2_single": {
        "x": 121.18,
        "y": 161.7,
        "width": 162,
        "height": 63,
        "centerX": 202.18,
        "centerY": 193.2,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 69.79,
        "fontSizePt": 69.79,
        "lineHeight": 75.37,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_640x100|banner7": {
    "sourceFile": "Appier_banner7_640x100_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 106,
        "y": 16,
        "width": 108,
        "height": 25,
        "centerX": 160,
        "centerY": 28.5
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 29,
        "y": 46,
        "width": 258,
        "height": 36,
        "centerX": 158,
        "centerY": 64
      },
      "副標題": {
        "x": 436.5,
        "y": 34,
        "width": 171,
        "height": 17,
        "centerX": 522,
        "centerY": 42.5
      },
      "蝦皮VIP_LOGO": {
        "x": 435,
        "y": 31,
        "width": 57,
        "height": 20,
        "centerX": 463.5,
        "centerY": 41
      },
      "蝦皮VIP_副標題": {
        "x": 494,
        "y": 37,
        "width": 115,
        "height": 14,
        "centerX": 551.5,
        "centerY": 44
      },
      "副標題_底色": {
        "x": 393,
        "y": 27,
        "width": 258,
        "height": 32,
        "centerX": 522,
        "centerY": 43
      },
      "警語": {
        "x": 476,
        "y": 61,
        "width": 92,
        "height": 8,
        "centerX": 522,
        "centerY": 65
      },
      "P_範圍": {
        "x": 303,
        "y": -1,
        "width": 116,
        "height": 102,
        "centerX": 361,
        "centerY": 50
      },
      "P": {
        "x": 298,
        "y": 18,
        "width": 121,
        "height": 65,
        "centerX": 358.5,
        "centerY": 50.5
      },
      "P_01": {
        "x": 358,
        "y": 29,
        "width": 65,
        "height": 64,
        "centerX": 390.5,
        "centerY": 61
      },
      "P_02": {
        "x": 293,
        "y": 8,
        "width": 102,
        "height": 79,
        "centerX": 344,
        "centerY": 47.5
      },
      "DECO_錢幣_右上": {
        "x": 590,
        "y": 73,
        "width": 46,
        "height": 34,
        "centerX": 613,
        "centerY": 90
      },
      "DECO_券_左上": {
        "x": 10,
        "y": 5,
        "width": 76,
        "height": 45,
        "centerX": 48,
        "centerY": 27.5
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 640,
        "height": 100,
        "centerX": 320,
        "centerY": 50
      },
      "__auto_price_v2_single": {
        "x": 335.98,
        "y": 34.85,
        "width": 77,
        "height": 31,
        "centerX": 374.48,
        "centerY": 50.35,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 33.11,
        "fontSizePt": 33.11,
        "lineHeight": 35.76,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_640x200|banner7": {
    "sourceFile": "Appier_banner7_640x200_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 116,
        "y": 29,
        "width": 107,
        "height": 25,
        "centerX": 169.5,
        "centerY": 41.5
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 41,
        "y": 59,
        "width": 258,
        "height": 36,
        "centerX": 170,
        "centerY": 77
      },
      "副標題": {
        "x": 51,
        "y": 115,
        "width": 237,
        "height": 23,
        "centerX": 169.5,
        "centerY": 126.5
      },
      "蝦皮VIP_LOGO": {
        "x": 48,
        "y": 109,
        "width": 80,
        "height": 28,
        "centerX": 88,
        "centerY": 123
      },
      "蝦皮VIP_副標題": {
        "x": 130,
        "y": 118,
        "width": 162,
        "height": 19,
        "centerX": 211,
        "centerY": 127.5
      },
      "副標題_底色": {
        "x": 40.5,
        "y": 104,
        "width": 258,
        "height": 44,
        "centerX": 169.5,
        "centerY": 126
      },
      "警語": {
        "x": 110,
        "y": 151,
        "width": 120,
        "height": 11,
        "centerX": 170,
        "centerY": 156.5
      },
      "P_範圍": {
        "x": 351,
        "y": 5,
        "width": 218,
        "height": 191,
        "centerX": 460,
        "centerY": 100.5
      },
      "P": {
        "x": 324,
        "y": 29,
        "width": 259,
        "height": 140,
        "centerX": 453.5,
        "centerY": 99
      },
      "P_01": {
        "x": 460,
        "y": 56,
        "width": 112,
        "height": 113,
        "centerX": 516,
        "centerY": 112.5
      },
      "P_02": {
        "x": 323,
        "y": 5,
        "width": 195,
        "height": 151,
        "centerX": 420.5,
        "centerY": 80.5
      },
      "DECO_錢幣_右上": {
        "x": 559,
        "y": 11,
        "width": 61,
        "height": 46,
        "centerX": 589.5,
        "centerY": 34
      },
      "DECO_券_左上": {
        "x": 315,
        "y": 13,
        "width": 92,
        "height": 58,
        "centerX": 361,
        "centerY": 42
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 640,
        "height": 200,
        "centerX": 320,
        "centerY": 100
      },
      "__auto_price_v2_single": {
        "x": 405.21,
        "y": 66.69,
        "width": 165,
        "height": 64,
        "centerX": 487.71,
        "centerY": 98.69,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 70.88,
        "fontSizePt": 70.88,
        "lineHeight": 76.55,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_672x560|banner7": {
    "sourceFile": "Appier_banner7_672x560_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 263,
        "y": 37,
        "width": 147,
        "height": 33,
        "centerX": 336.5,
        "centerY": 53.5
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 153,
        "y": 81,
        "width": 366,
        "height": 51,
        "centerX": 336,
        "centerY": 106.5
      },
      "副標題": {
        "x": 171,
        "y": 156,
        "width": 330,
        "height": 32,
        "centerX": 336,
        "centerY": 172
      },
      "蝦皮VIP_LOGO": {
        "x": 166,
        "y": 148,
        "width": 111,
        "height": 39,
        "centerX": 221.5,
        "centerY": 167.5
      },
      "蝦皮VIP_副標題": {
        "x": 280,
        "y": 160,
        "width": 226,
        "height": 27,
        "centerX": 393,
        "centerY": 173.5
      },
      "副標題_底色": {
        "x": 153,
        "y": 141,
        "width": 366,
        "height": 62,
        "centerX": 336,
        "centerY": 172
      },
      "警語": {
        "x": 248,
        "y": 207,
        "width": 175,
        "height": 15,
        "centerX": 335.5,
        "centerY": 214.5
      },
      "P_範圍": {
        "x": 166,
        "y": 232,
        "width": 341,
        "height": 301,
        "centerX": 336.5,
        "centerY": 382.5
      },
      "P": {
        "x": 68,
        "y": 233,
        "width": 539,
        "height": 292,
        "centerX": 337.5,
        "centerY": 379
      },
      "P_01": {
        "x": 301,
        "y": 301,
        "width": 214,
        "height": 212,
        "centerX": 408,
        "centerY": 407
      },
      "P_02": {
        "x": 77,
        "y": 228,
        "width": 338,
        "height": 264,
        "centerX": 246,
        "centerY": 360
      },
      "DECO_錢幣_右上": {
        "x": 481,
        "y": 218,
        "width": 100,
        "height": 83,
        "centerX": 531,
        "centerY": 259.5
      },
      "DECO_券_左上": {
        "x": 91,
        "y": 215,
        "width": 195,
        "height": 133,
        "centerX": 188.5,
        "centerY": 281.5
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 672,
        "height": 560,
        "centerX": 336,
        "centerY": 280
      },
      "__auto_price_v2_single": {
        "x": 237.7,
        "y": 311.85,
        "width": 342,
        "height": 133,
        "centerX": 408.7,
        "centerY": 378.35,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 147.51,
        "fontSizePt": 147.51,
        "lineHeight": 159.31,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#EE4D2D",
        "fontWeight": "700"
      }
    }
  },
  "Appier_320x50|banner8": {
    "sourceFile": "Appier_banner8_320x50_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 53,
        "y": 10,
        "width": 54,
        "height": 12,
        "centerX": 80,
        "centerY": 16
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 17,
        "y": 25,
        "width": 126,
        "height": 18,
        "centerX": 80,
        "centerY": 34
      },
      "副標題": {
        "x": 216.5,
        "y": 17,
        "width": 92,
        "height": 10,
        "centerX": 262.5,
        "centerY": 22
      },
      "蝦皮VIP_LOGO": {
        "x": 216,
        "y": 16,
        "width": 30,
        "height": 11,
        "centerX": 231,
        "centerY": 21.5
      },
      "蝦皮VIP_副標題": {
        "x": 247,
        "y": 19,
        "width": 62,
        "height": 7,
        "centerX": 278,
        "centerY": 22.5
      },
      "副標題_底色": {
        "x": 206.5,
        "y": 13,
        "width": 112,
        "height": 18,
        "centerX": 262.5,
        "centerY": 22
      },
      "警語": {
        "x": 239,
        "y": 31,
        "width": 47,
        "height": 5,
        "centerX": 262.5,
        "centerY": 33.5
      },
      "P_範圍": {
        "x": 148.6,
        "y": 0.5,
        "width": 54.7,
        "height": 49.1,
        "centerX": 175.95,
        "centerY": 25.05
      },
      "P": {
        "x": 146.68,
        "y": 9.94,
        "width": 58.54,
        "height": 31.16,
        "centerX": 175.95,
        "centerY": 25.52,
        "rotation": 0
      },
      "P_01": {
        "x": 177.84,
        "y": 14.66,
        "width": 30.22,
        "height": 30.22,
        "centerX": 192.95,
        "centerY": 29.77,
        "rotation": 0
      },
      "P_02": {
        "x": 145.74,
        "y": 5.22,
        "width": 46.27,
        "height": 35.88,
        "centerX": 168.875,
        "centerY": 23.16,
        "rotation": 0
      },
      "DECO_錢幣_右上": {
        "x": 298,
        "y": 36,
        "width": 22,
        "height": 17,
        "centerX": 309,
        "centerY": 44.5
      },
      "DECO_券_左上": {
        "x": 7,
        "y": 0,
        "width": 41,
        "height": 25,
        "centerX": 27.5,
        "centerY": 12.5
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 320,
        "height": 50,
        "centerX": 160,
        "centerY": 25
      },
      "__auto_price_v2_single": {
        "x": 164.57,
        "y": 18.55,
        "width": 38,
        "height": 14,
        "centerX": 183.57,
        "centerY": 25.55,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 15.11,
        "fontSizePt": 15.11,
        "lineHeight": 16.32,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_672x560|banner8": {
    "sourceFile": "Appier_banner8_672x560_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 263,
        "y": 37,
        "width": 147,
        "height": 33,
        "centerX": 336.5,
        "centerY": 53.5
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 153,
        "y": 81,
        "width": 366,
        "height": 51,
        "centerX": 336,
        "centerY": 106.5
      },
      "副標題": {
        "x": 168,
        "y": 156,
        "width": 336,
        "height": 32,
        "centerX": 336,
        "centerY": 172
      },
      "蝦皮VIP_LOGO": {
        "x": 166,
        "y": 148,
        "width": 111,
        "height": 39,
        "centerX": 221.5,
        "centerY": 167.5
      },
      "蝦皮VIP_副標題": {
        "x": 280,
        "y": 160,
        "width": 226,
        "height": 27,
        "centerX": 393,
        "centerY": 173.5
      },
      "副標題_底色": {
        "x": 153,
        "y": 141,
        "width": 366,
        "height": 62,
        "centerX": 336,
        "centerY": 172
      },
      "警語": {
        "x": 248,
        "y": 207,
        "width": 175,
        "height": 15,
        "centerX": 335.5,
        "centerY": 214.5
      },
      "P_範圍": {
        "x": 166,
        "y": 232,
        "width": 341,
        "height": 301,
        "centerX": 336.5,
        "centerY": 382.5
      },
      "P": {
        "x": 68,
        "y": 233,
        "width": 539,
        "height": 292,
        "centerX": 337.5,
        "centerY": 379
      },
      "P_01": {
        "x": 301,
        "y": 301,
        "width": 214,
        "height": 212,
        "centerX": 408,
        "centerY": 407
      },
      "P_02": {
        "x": 77,
        "y": 228,
        "width": 338,
        "height": 264,
        "centerX": 246,
        "centerY": 360
      },
      "DECO_錢幣_右上": {
        "x": 481,
        "y": 218,
        "width": 100,
        "height": 83,
        "centerX": 531,
        "centerY": 259.5
      },
      "DECO_券_左上": {
        "x": 91,
        "y": 215,
        "width": 195,
        "height": 133,
        "centerX": 188.5,
        "centerY": 281.5
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 672,
        "height": 560,
        "centerX": 336,
        "centerY": 280
      },
      "__auto_price_v2_single": {
        "x": 233.15,
        "y": 316.75,
        "width": 349,
        "height": 125,
        "centerX": 407.65,
        "centerY": 379.25,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 139.16,
        "fontSizePt": 139.16,
        "lineHeight": 150.29,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      }
    }
  },
  "Appier_960x640|banner8": {
    "sourceFile": "Appier_banner8_960x640_edited.json",
    "layers": {
      "蝦皮商城_LOGO_純文字": {
        "x": 393,
        "y": 28,
        "width": 176,
        "height": 41,
        "centerX": 481,
        "centerY": 48.5
      },
      "橫式_25號商城狂購節_LOGO_黃": {
        "x": 264,
        "y": 80,
        "width": 433,
        "height": 60,
        "centerX": 480.5,
        "centerY": 110
      },
      "副標題": {
        "x": 283.5,
        "y": 170,
        "width": 393,
        "height": 37,
        "centerX": 480,
        "centerY": 188.5
      },
      "蝦皮VIP_LOGO": {
        "x": 281,
        "y": 161,
        "width": 130,
        "height": 46,
        "centerX": 346,
        "centerY": 184
      },
      "蝦皮VIP_副標題": {
        "x": 415,
        "y": 175,
        "width": 264,
        "height": 31,
        "centerX": 547,
        "centerY": 190.5
      },
      "副標題_底色": {
        "x": 263.5,
        "y": 152,
        "width": 433,
        "height": 73,
        "centerX": 480,
        "centerY": 188.5
      },
      "警語": {
        "x": 377,
        "y": 229,
        "width": 208,
        "height": 18,
        "centerX": 481,
        "centerY": 238
      },
      "P_範圍": {
        "x": 271,
        "y": 258,
        "width": 419,
        "height": 370,
        "centerX": 480.5,
        "centerY": 443
      },
      "P": {
        "x": 139,
        "y": 270,
        "width": 684,
        "height": 370,
        "centerX": 481,
        "centerY": 455
      },
      "P_01": {
        "x": 450,
        "y": 349,
        "width": 270,
        "height": 269,
        "centerX": 585,
        "centerY": 483.5
      },
      "P_02": {
        "x": 167,
        "y": 258,
        "width": 427,
        "height": 333,
        "centerX": 380.5,
        "centerY": 424.5
      },
      "DECO_錢幣_右上": {
        "x": 687,
        "y": 248,
        "width": 121,
        "height": 101,
        "centerX": 747.5,
        "centerY": 298.5
      },
      "DECO_券_左上": {
        "x": 189,
        "y": 243,
        "width": 219,
        "height": 149,
        "centerX": 298.5,
        "centerY": 317.5
      },
      "KV_BG": {
        "x": 0,
        "y": 0,
        "width": 960,
        "height": 640,
        "centerX": 480,
        "centerY": 320
      },
      "價格": {
        "x": 360.25,
        "y": 378.91,
        "width": 418,
        "height": 150,
        "centerX": 569.25,
        "centerY": 453.91,
        "rotation": 4.7
      }
    }
  },
  "Appier_640x100|banner8": {
    "sourceFile": "Appier_banner8_640x100_edited.json",
    "layers": {
      "__auto_price_v2_single": {
        "x": 334.75,
        "y": 36.05,
        "width": 79,
        "height": 29,
        "centerX": 374.25,
        "centerY": 50.55,
        "rotation": 4.22,
        "hidden": false,
        "locked": false,
        "fontSizePx": 31.24,
        "fontSizePt": 31.24,
        "lineHeight": 33.74,
        "lineHeightMultiplier": 1.08,
        "letterSpacing": 0,
        "align": "center",
        "color": "#D0011B",
        "fontWeight": "700"
      },
      "P_範圍": {
        "x": 303,
        "y": -1,
        "width": 116,
        "height": 102,
        "centerX": 361,
        "centerY": 50
      },
      "P": {
        "x": 298,
        "y": 18,
        "width": 121,
        "height": 65,
        "centerX": 358.5,
        "centerY": 50.5
      },
      "P_01": {
        "x": 358,
        "y": 29,
        "width": 65,
        "height": 64,
        "centerX": 390.5,
        "centerY": 61
      },
      "P_02": {
        "x": 293,
        "y": 8,
        "width": 102,
        "height": 79,
        "centerX": 344,
        "centerY": 47.5
      }
    }
  }
};

  window.OMWave1InitialPlacements = Object.freeze(placements);
})();
