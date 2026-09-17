WITH translations (
  source_record_key,
  locale,
  official_name,
  summary
) AS (
  VALUES
    ('kccci', 'en', 'Korea Chinese Chamber of Commerce and Industry (KCCCI)', 'Supports economic, trade, and cultural exchange through a network of overseas Chinese merchants and Chinese-affiliated companies in Korea.'),
    ('kccci', 'zh', '韩国中华总商会（KCCCI）', '以在韩华侨、华商及中资企业网络为基础，促进经济、贸易与文化交流。'),
    ('kscc', 'en', 'Korea Sichuan-Chongqing Chamber of Commerce (KSCC)', 'Supports economic, trade, and cultural exchange, business matching, and market entry between Korea and Sichuan and Chongqing, China.'),
    ('kscc', 'zh', '韩国四川重庆总商会（KSCC）', '促进韩国与中国四川省、重庆市之间的经济、贸易和文化交流，并支持企业对接与市场拓展。'),
    ('korea-china-economic-association', 'en', 'Korea-China Economic Association', 'Supports Korea-China economic and trade cooperation and private-sector economic exchange.'),
    ('korea-china-economic-association', 'zh', '韩中经济协会', '促进韩中经济贸易合作与民间经济交流。'),
    ('kcea', 'en', 'Korea-China Entrepreneurs Association (KCEA)', 'Supports bilateral business networks, business matching, and Korean companies entering the Chinese market.'),
    ('kcea', 'zh', '韩中企业家协会（KCEA）', '促进两国企业网络与商务对接，并支持韩国企业进入中国市场。'),
    ('kapea', 'en', 'Korea Asia-Pacific Economic Association', 'Operates economic cooperation forums with Chinese local governments and companies through the Korea-China Private Economic Cooperation Forum.'),
    ('kapea', 'zh', '韩国亚太经济协会', '以韩中民间经济合作论坛为基础，与中国地方政府和企业开展经济合作论坛。'),
    ('korea-china-exchange-association', 'en', 'Korea-China Exchange Association', 'A Ministry of Foreign Affairs-approved nonprofit organization promoting private-sector Korea-China exchange and cooperation in economic and cultural fields.'),
    ('korea-china-exchange-association', 'zh', '韩中交流协会', '经韩国外交部批准设立的非营利外交团体，推动经济、文化等领域的韩中民间交流与合作。'),
    ('korea-china-global-association', 'en', 'Korea-China Global Association', 'Organizes economic, social, and cultural exchange, business expansion, local-government connections, and forums.'),
    ('korea-china-global-association', 'zh', '韩中全球协会', '开展经济、社会与文化交流，支持企业拓展、地方政府对接及论坛活动。'),
    ('korea-china-friendship-federation', 'en', 'Korea-China Friendship Federation', 'A joint network of civic organizations dedicated to friendship between Korea and China.'),
    ('korea-china-friendship-federation', 'zh', '韩中友好联合总会', '由多个韩中友好社会团体共同参与的联合网络。'),
    ('korea-china-friendship-association', 'en', 'Korea-China Friendship Association', 'A nonprofit organization under the Ministry of Foreign Affairs that promotes Korea-China friendship, civic diplomacy, and youth exchange.'),
    ('korea-china-friendship-association', 'zh', '韩中友好协会', '韩国外交部主管的非营利法人，推动韩中友好、民间外交及青年交流。'),
    ('korea-china-city-friendship-association', 'en', 'Korea-China City Friendship Association', 'Supports exchange and cooperation between cities and local governments in Korea and China.'),
    ('korea-china-city-friendship-association', 'zh', '韩中城市友好协会', '支持韩国与中国城市及地方政府之间的交流与合作。'),
    ('korea-china-education-exchange-association', 'en', 'Korea-China Education Exchange Association', 'Supports university and educational-institution exchange, study-abroad programs, and education networks between Korea and China.'),
    ('korea-china-education-exchange-association', 'zh', '韩中教育交流协会', '促进韩中大学及教育机构交流，并支持留学与教育网络建设。'),
    ('korea-china-cultural-friendship-association', 'en', 'Korea-China Cultural Friendship Association', 'A registered nonprofit organization promoting Korea-China exchange in culture, arts, youth, and academia.'),
    ('korea-china-cultural-friendship-association', 'zh', '韩中文化友好协会', '在韩国文化体育观光部登记的非营利法人，推动韩中文化、艺术、青年及学术交流。'),
    ('kccea', 'en', 'Korea-China Economy, Culture and Education Association', 'Promotes private-sector Korea-China cooperation, educational and cultural exchange, and Chinese-language programs.'),
    ('kccea', 'zh', '韩中经济文化教育协会', '推动韩中民间合作、教育文化交流及中文相关项目。'),
    ('korea-china-beauty-industry-association', 'en', 'Korea-China Beauty Industry Association', 'Supports beauty-industry exchange, member-company economic cooperation, market entry into China, and investment attraction.'),
    ('korea-china-beauty-industry-association', 'zh', '韩中美业协会', '促进韩中美容产业交流、会员企业经济合作，并支持进入中国市场与吸引投资。'),
    ('korea-china-law-association', 'en', 'Korea-China Law Association', 'Conducts research on Chinese law, legal-professional exchange, China law forums, and academic activities.'),
    ('korea-china-law-association', 'zh', '韩中法学会', '开展中国法研究、法律专家交流、中国法制论坛及学术活动。'),
    ('korean-association-contemporary-china-studies', 'en', 'Korean Association for Contemporary China Studies', 'A registered organization conducting academic and cultural research on China and Korea-China cultural exchange.'),
    ('korean-association-contemporary-china-studies', 'zh', '韩国现代中国研究会', '在韩国文化体育观光部登记的法人，开展中国相关学术文化研究及韩中文化交流。'),
    ('korea-overseas-chinese-federation', 'en', 'Federation of Overseas Chinese in Korea', 'A civic network for exchange and cooperation among overseas Chinese communities residing in Korea.'),
    ('korea-overseas-chinese-federation', 'zh', '韩国华侨华人联合总会', '面向居住在韩国的华侨华人，促进交流与合作的民间网络。')
)
INSERT INTO "member_service_organization_localizations" (
  "organization_id",
  "locale",
  "official_name",
  "display_name",
  "summary",
  "is_official",
  "updated_at"
)
SELECT
  organization.id,
  translations.locale::locale,
  translations.official_name,
  translations.official_name,
  translations.summary,
  false,
  now()
FROM translations
INNER JOIN "member_service_organizations" organization
  ON organization."source_system" = 'user_curated_korea_china_directory_v1'
  AND organization."source_record_key" = translations.source_record_key
ON CONFLICT ("organization_id", "locale") DO UPDATE SET
  "official_name" = EXCLUDED."official_name",
  "display_name" = EXCLUDED."display_name",
  "summary" = EXCLUDED."summary",
  "is_official" = false,
  "updated_at" = now();