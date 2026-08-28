import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building, Mail, Phone, Globe, Info, MapPin } from 'lucide-react';
import { Member } from '@shared/schema';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { t } from '@/lib/i18n';

interface MemberCardProps {
  member: Member;
}

export default function MemberCard({ member }: MemberCardProps) {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const getMembershipBadge = (level: string) => {
    const badgeMap = {
      regular: { variant: 'default' as const, label: t('members.levels.regular'), className: 'badge-primary' },
      premium: { variant: 'secondary' as const, label: t('members.levels.premium'), className: 'badge-secondary' },
      sponsor: { variant: 'outline' as const, label: t('members.levels.sponsor'), className: 'badge-accent' },
    };
    
    const config = badgeMap[level as keyof typeof badgeMap] || { variant: 'outline' as const, label: level, className: '' };
    return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
  };

  const getCountryFlag = (country: string) => {
    const flags = {
      Korea: '🇰🇷',
      China: '🇨🇳',
    };
    return flags[country as keyof typeof flags] || '🌍';
  };

  const handleContact = () => {
    if (!isAuthenticated) {
      toast({
        title: "로그인 필요",
        description: "회원사 연락처는 로그인 후 이용하실 수 있습니다.",
        variant: "destructive",
      });
      return;
    }
    
    toast({
      title: "연락처 정보",
      description: `${member.companyName}의 연락처는 로그인 후 문의를 통해 확인하실 수 있습니다.`,
    });
  };

  const handleViewProfile = () => {
    // Implementation for viewing detailed profile
    toast({
      title: "프로필 보기",
      description: `${member.companyName}의 상세 정보를 확인합니다.`,
    });
  };

  return (
    <Card className="card-hover border border-border" data-testid={`member-card-${member.id}`}>
      <CardContent className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          {/* Company Logo */}
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
            {member.logo ? (
              <img
                src={member.logo}
                alt={`${member.companyName} logo`}
                className="h-full w-full object-contain rounded-lg"
                width={64}
                height={64}
                loading="lazy"
              />
            ) : (
              <Building className="h-8 w-8 text-muted-foreground" />
            )}
          </div>
          
          {/* Badges */}
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              {getMembershipBadge(member.membershipLevel)}
              <span className="text-2xl" title={member.country}>
                {getCountryFlag(member.country)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Company Info */}
        <div className="mb-4">
          <h3 className="text-lg font-bold text-foreground mb-1 line-clamp-1" data-testid={`member-name-${member.id}`}>
            {member.companyName}
          </h3>
          {member.companyNameEn && (
            <p className="text-sm text-muted-foreground lang-en mb-1">{member.companyNameEn}</p>
          )}
          {member.companyNameZh && (
            <p className="text-sm text-muted-foreground lang-zh mb-1">{member.companyNameZh}</p>
          )}
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <span>{member.industry}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {member.city}, {member.country}
            </span>
          </div>
        </div>
        
        {/* Description */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {member.description || '회사 소개가 없습니다.'}
        </p>
        
        {/* Contact information is intentionally not part of the public member DTO. */}
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">회원사 문의</div>
          <div className="font-medium text-sm">로그인 후 문의를 이용해 주세요.</div>
          {member.website && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Globe className="h-3 w-3" />
              <a
                href={member.website}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                웹사이트
              </a>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={handleContact}
            data-testid={`button-contact-${member.id}`}
          >
            <Mail className="h-4 w-4" />
            {t('members.contact')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewProfile}
            data-testid={`button-profile-${member.id}`}
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Additional Info */}
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>가입일: {new Date(member.createdAt).toLocaleDateString()}</span>
            {member.isPublic ? (
              <Badge variant="outline" className="text-xs">
                공개
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">
                비공개
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
