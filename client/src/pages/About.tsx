import { Building2, Target, Lightbulb, Users, Handshake } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-600 to-blue-800 text-white py-20">
        <div className="container">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              韓国川渝総商会
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              韓国川渝総商会（KSCC）は韓・川渝在韓国の川渝総全商会、専ら人士及び中韓経済交流人士所建立的創業及貿易平台共同創建。
            </p>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="text-lg leading-relaxed">
                商貿以"韓国、四川、共赢"為核心理念，致力於推動中国四川地区（四川省、重慶市）韓民間交流、貿易、投資、科技與文化等多領域的深度合作，成為兩国之間最具影響力的交流合作平台之一。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">使命与愿景</h2>
          
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Mission */}
            <Card className="p-8">
              <div className="flex items-center mb-4">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg mr-4">
                  <Target className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold">使命</h3>
              </div>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>促进川渝地区与韩国的经贸往来与双向投资</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>创造在韩川渝商会的互助交流平台</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>促进文化、教育、科技、经济等领域的民间交流</span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-600 mr-2">•</span>
                  <span>构建中韩民间合作的可持续发展长远战略</span>
                </li>
              </ul>
            </Card>

            {/* Vision */}
            <Card className="p-8">
              <div className="flex items-center mb-4">
                <div className="bg-red-100 dark:bg-red-900 p-3 rounded-lg mr-4">
                  <Lightbulb className="h-8 w-8 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="text-2xl font-bold">愿景</h3>
              </div>
              <ul className="space-y-3 text-gray-600 dark:text-gray-300">
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">•</span>
                  <span>成为撮合两国力的桥梁和推力合作伙伴平台</span>
                </li>
                <li className="flex items-start">
                  <span className="text-red-600 mr-2">•</span>
                  <span>为中韩企业、社会各个人员提供全知识互在价值</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Core Functions */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">核心功能</h2>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Function 1 */}
            <Card className="p-6">
              <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
                <h3 className="text-xl font-bold">贸易与投资促进平台</h3>
              </div>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• 韩国与韩国企业提供一站式贸易促销与产品推介</li>
                <li>• 协助企业克服贸易壁垒及流融通难题</li>
                <li>• 提供贸易咨询、政策解读、投融资及贸易展览支持</li>
              </ul>
            </Card>

            {/* Function 2 */}
            <Card className="p-6">
              <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
                <h3 className="text-xl font-bold">产业对接与专业咨询</h3>
              </div>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• 韩方川渝文化节"韩国一座韩国文化与四川"贵族商机"举办</li>
                <li>• 推动中韩双方组委会诚信关系</li>
                <li>• 通过文化、科技及公益活动，增进理解与民族友谊与发展</li>
              </ul>
            </Card>

            {/* Function 3 */}
            <Card className="p-6">
              <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
                <h3 className="text-xl font-bold">创新与综合服务</h3>
              </div>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• 全面促进企业积极创新品牌发展战略</li>
                <li>• 组织商考察、商务对接、行业联盟会议</li>
                <li>• 构建两国企业共商机遇、协商野合作</li>
              </ul>
            </Card>

            {/* Function 4 */}
            <Card className="p-6">
              <div className="bg-blue-600 text-white p-4 rounded-lg mb-4">
                <h3 className="text-xl font-bold">文化交流与社会发展</h3>
              </div>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>• 为企业企业展示企业品牌及产品发展业务</li>
                <li>• 组织专题论坛、投资推介等平台服务</li>
                <li>• 推动新创企与中国在优质企业合作价值</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Organization Structure */}
      <section className="py-16">
        <div className="container">
          <h2 className="text-3xl font-bold text-center mb-12">组织架构</h2>
          
          <div className="max-w-3xl mx-auto">
            <Card className="p-8">
              <div className="flex items-center mb-6">
                <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-lg mr-4">
                  <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold">组织结构</h3>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  韩国川渝总商会设立总会长、副会长、秘书长及理事会，并下设多个专业委员会（经贸、文化、科技、青年、妇女、公益等）。
                </p>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-4">
                  通过专业化管理与协同化组织，确保商会高效运作服务开展。
                </p>
                <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                  持续推进在中韩贸易桥梁多层次及动态力。
                </p>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Future Vision */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
        <div className="container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-white/10 p-4 rounded-full">
                <Handshake className="h-12 w-12" />
              </div>
            </div>
            <h2 className="text-3xl font-bold mb-6">携手同行 共创未来</h2>
            <p className="text-xl text-blue-100 leading-relaxed mb-6">
              展望未来，韩国川渝总商会将坚定地致力于深化交流与韩国贸易桥梁双向投资发展，韩国川渝总商会正以开拓创新的姿态融通产业构建与培育。
            </p>
            <p className="text-lg text-blue-100 leading-relaxed">
              未来，商会将持续拓展贸易交流领域，解锁新资源、转移知能，转化知能，文化贸易、医疗健康、教育培训创新领域的组织架构合作，让"川渝情缘"与"韩国缘"在全球格局上交相辉映！
            </p>
          </div>
        </div>
      </section>

      {/* Three Pillars Images Section */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="container">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="p-6 text-center">
              <div className="bg-blue-100 dark:bg-blue-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-10 w-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">企业对接</h3>
              <p className="text-gray-600 dark:text-gray-300">促进中韩企业间的商务合作与交流</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="bg-red-100 dark:bg-red-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-10 w-10 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">文化交流</h3>
              <p className="text-gray-600 dark:text-gray-300">推动中韩文化、教育、科技交流</p>
            </Card>

            <Card className="p-6 text-center">
              <div className="bg-blue-100 dark:bg-blue-900 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="h-10 w-10 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold mb-2">法律服务</h3>
              <p className="text-gray-600 dark:text-gray-300">提供专业的法律咨询和支持服务</p>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
