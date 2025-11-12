import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { sql } from 'drizzle-orm';
import { tiers, roles, permissions, rolePermissions } from '../shared/schema';

// Tier definitions
const TIERS = [
  {
    code: 'MEMBER',
    name: '일반 회원',
    nameEn: 'Regular Member',
    nameZh: '普通会员',
    annualFee: 0,
    benefits: ['이벤트 참가', '자료실 열람', '뉴스 구독'],
    order: 1,
  },
  {
    code: 'PRO',
    name: '전문 회원',
    nameEn: 'Professional Member',
    nameZh: '专业会员',
    annualFee: 100000,
    benefits: ['프리미엄 콘텐츠 접근', '비즈니스 매칭', '우선 이벤트 신청'],
    order: 2,
  },
  {
    code: 'CORP',
    name: '기업 회원',
    nameEn: 'Corporate Member',
    nameZh: '企业会员',
    annualFee: 500000,
    benefits: ['전용 상담', '기업 홍보', '스폰서십 기회'],
    order: 3,
  },
  {
    code: 'PARTNER',
    name: '파트너',
    nameEn: 'Partner',
    nameZh: '合作伙伴',
    annualFee: 0,
    benefits: ['협력 기관 혜택', '공동 이벤트 기획'],
    order: 4,
  },
  {
    code: 'ADMIN',
    name: '운영진',
    nameEn: 'Administrator',
    nameZh: '管理员',
    annualFee: 0,
    benefits: ['전체 시스템 접근 권한'],
    order: 5,
  },
] as const;

// Role definitions
const ROLES = [
  { code: 'guest', name: '게스트', description: '비회원 방문자' },
  { code: 'member', name: '회원', description: '일반 회원' },
  { code: 'editor', name: '에디터', description: '콘텐츠 작성 및 편집 권한' },
  { code: 'operator', name: '운영자', description: '시스템 운영 권한' },
  { code: 'admin', name: '관리자', description: '최고 관리자 권한' },
] as const;

// Permission definitions (resource.action format)
const PERMS = [
  // Events
  ['event.read', 'event', 'read', '이벤트 열람'],
  ['event.create', 'event', 'create', '이벤트 생성'],
  ['event.update', 'event', 'update', '이벤트 수정'],
  ['event.delete', 'event', 'delete', '이벤트 삭제'],
  ['event.publish', 'event', 'publish', '이벤트 발행'],
  ['event.attendee.manage', 'event', 'manage', '참석자 관리'],
  
  // News
  ['news.read', 'news', 'read', '뉴스 열람'],
  ['news.create', 'news', 'create', '뉴스 작성'],
  ['news.update', 'news', 'update', '뉴스 수정'],
  ['news.delete', 'news', 'delete', '뉴스 삭제'],
  ['news.publish', 'news', 'publish', '뉴스 발행'],
  
  // Resources
  ['resource.read', 'resource', 'read', '자료 열람'],
  ['resource.upload', 'resource', 'create', '자료 업로드'],
  ['resource.update', 'resource', 'update', '자료 수정'],
  ['resource.delete', 'resource', 'delete', '자료 삭제'],
  ['resource.publish', 'resource', 'publish', '자료 발행'],
  
  // Members
  ['member.read', 'member', 'read', '회원 정보 열람'],
  ['member.create', 'member', 'create', '회원 등록'],
  ['member.update', 'member', 'update', '회원 정보 수정'],
  ['member.delete', 'member', 'delete', '회원 삭제'],
  ['member.manage', 'member', 'manage', '회원 관리'],
  
  // Partners
  ['partner.read', 'partner', 'read', '파트너 정보 열람'],
  ['partner.manage', 'partner', 'manage', '파트너 관리'],
  
  // Inquiries
  ['inquiry.read', 'inquiry', 'read', '문의 열람'],
  ['inquiry.respond', 'inquiry', 'update', '문의 응답'],
  
  // System
  ['system.dashboard', 'system', 'read', '대시보드 접근'],
  ['system.settings', 'system', 'manage', '시스템 설정'],
] as const;

// Role-Permission mapping (wildcard support: '*' for all, 'resource.*' for all actions on resource)
const ROLE_PERMS: Record<string, string[]> = {
  guest: [
    'event.read',
    'news.read',
    'partner.read',
  ],
  member: [
    'event.read',
    'news.read',
    'resource.read',
    'member.read',
    'partner.read',
  ],
  editor: [
    'event.*',
    'news.*',
    'resource.*',
    'member.read',
    'partner.read',
    'inquiry.read',
  ],
  operator: [
    'event.*',
    'news.*',
    'resource.*',
    'member.*',
    'partner.*',
    'inquiry.*',
    'system.dashboard',
  ],
  admin: ['*'], // All permissions
};

// Expand wildcards
function expandPermissions(patterns: string[], allPerms: string[]): string[] {
  const result = new Set<string>();
  
  for (const pattern of patterns) {
    if (pattern === '*') {
      // Grant all permissions
      allPerms.forEach(p => result.add(p));
    } else if (pattern.endsWith('.*')) {
      // Grant all permissions for a resource
      const resource = pattern.replace('.*', '.');
      allPerms.filter(p => p.startsWith(resource)).forEach(p => result.add(p));
    } else {
      // Exact match
      result.add(pattern);
    }
  }
  
  return Array.from(result);
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const sqlClient = neon(dbUrl);
  const db = drizzle(sqlClient);

  console.log('🌱 Seeding ACL data...');

  try {
    // 1. Seed Tiers
    console.log('📊 Seeding tiers...');
    for (const tier of TIERS) {
      await db.insert(tiers).values(tier)
        .onConflictDoUpdate({
          target: tiers.code,
          set: {
            name: tier.name,
            nameEn: tier.nameEn,
            nameZh: tier.nameZh,
            annualFee: tier.annualFee,
            benefits: tier.benefits,
            order: tier.order,
          },
        });
    }
    console.log(`✅ Seeded ${TIERS.length} tiers`);

    // 2. Seed Roles
    console.log('👤 Seeding roles...');
    for (const role of ROLES) {
      await db.insert(roles).values(role)
        .onConflictDoUpdate({
          target: roles.code,
          set: {
            name: role.name,
            description: role.description,
          },
        });
    }
    console.log(`✅ Seeded ${ROLES.length} roles`);

    // 3. Seed Permissions
    console.log('🔐 Seeding permissions...');
    const permMap = new Map<string, string>();
    for (const [key, resource, action, description] of PERMS) {
      const result = await db.insert(permissions).values({
        key,
        resource,
        action,
        description,
      })
      .onConflictDoUpdate({
        target: permissions.key,
        set: { resource, action, description },
      })
      .returning({ id: permissions.id });
      
      permMap.set(key, result[0].id);
    }
    console.log(`✅ Seeded ${PERMS.length} permissions`);

    // 4. Seed Role-Permission mappings
    console.log('🔗 Seeding role-permission mappings...');
    const allPermKeys = PERMS.map(([key]) => key);
    
    for (const [roleCode, permPatterns] of Object.entries(ROLE_PERMS)) {
      // Get role ID
      const roleResult = await db.select({ id: roles.id })
        .from(roles)
        .where(sql`${roles.code} = ${roleCode}`)
        .limit(1);
      
      if (roleResult.length === 0) continue;
      const roleId = roleResult[0].id;

      // Expand permission patterns
      const expandedPerms = expandPermissions(permPatterns, allPermKeys);
      
      // Clear existing mappings for this role
      await db.delete(rolePermissions).where(sql`${rolePermissions.roleId} = ${roleId}`);
      
      // Insert new mappings
      for (const permKey of expandedPerms) {
        const permId = permMap.get(permKey);
        if (permId) {
          await db.insert(rolePermissions).values({
            roleId,
            permissionId: permId,
          }).onConflictDoNothing();
        }
      }
      
      console.log(`  ✓ ${roleCode}: ${expandedPerms.length} permissions`);
    }
    console.log('✅ Role-permission mappings completed');

    console.log('\n🎉 ACL seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding ACL:', error);
    throw error;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
