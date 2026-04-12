import { describe, expect, it } from 'vitest';
import { categorizeMealViewerItem, normalizeMenuResponse } from './menu-core.js';

describe('menu-core', () => {
  it('falls back to non-breakfast blocks when lunch is named differently', () => {
    const result = normalizeMenuResponse(
      {
        schoolName: 'BENTONMIDDLE',
        menuSchedules: [
          {
            dateInformation: { dateFull: '2026-04-13T00:00:00' },
            menuBlocks: [
              {
                blockName: 'Main Line',
                cafeteriaLineList: {
                  data: [
                    {
                      foodItemList: {
                        data: [
                          { item_Name: 'Chicken Sandwich', item_Type: 'Main' },
                          { item_Name: 'Garden Salad', item_Type: 'Vegetable' },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
      { todayISO: '2026-04-13' }
    );

    expect(result.days).toHaveLength(1);
    expect(result.days[0].no_information_provided).toBe(false);
    expect(result.days[0].sections.map((section) => section.title)).toContain('Entree');
    expect(result.days[0].sections.flatMap((section) => section.items)).toContain('Chicken Sandwich');
  });

  it('classifies tricky menu items more accurately', () => {
    expect(categorizeMealViewerItem({ item_Name: 'Apple Crisp', item_Type: '' })).toBe('Dessert');
    expect(categorizeMealViewerItem({ item_Name: 'Marinara Dipping Sauce', item_Type: '' })).toBe('Condiments');
    expect(categorizeMealViewerItem({ item_Name: 'Meatballs (Halal)', item_Type: '' })).toBe('Entree');
  });
});
