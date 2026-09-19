UPDATE "member_service_organizations"
SET "organization_type" = CASE "organization_type"
  WHEN '경제' THEN '경제·비즈니스'
  WHEN '경제/민관' THEN '경제·비즈니스'
  WHEN '기업' THEN '경제·비즈니스'
  WHEN '중국계 상회' THEN '경제·비즈니스'
  WHEN '지역 특화 상회' THEN '경제·비즈니스'
  WHEN '화교·화인' THEN '경제·비즈니스'
  WHEN '경제·문화·교육' THEN '문화·교육'
  WHEN '교육' THEN '문화·교육'
  WHEN '문화' THEN '문화·교육'
  WHEN '종합교류' THEN '교류·협력'
  WHEN '연합 네트워크' THEN '교류·협력'
  WHEN '우호/외교' THEN '교류·협력'
  WHEN '지역정부' THEN '교류·협력'
  WHEN '법률/학술' THEN '법률·연구'
  WHEN '연구·문화' THEN '법률·연구'
  WHEN '산업' THEN '산업'
  ELSE "organization_type"
END
WHERE "source_system" = 'user_curated_korea_china_directory_v1';