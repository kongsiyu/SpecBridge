# 同步策略简化与增强 - 需求文档

## 1. 项目概述

### 1.1 背景
SpecBridge 当前的同步策略存在以下问题：
- 三层结构（Epic-Story-Task）过于复杂，增加了使用难度
- Task 和 Requirement 的关联关系不明确，导致同步结果不可预测
- GitHub 同步缺乏灵活性，Issue 和 Project 功能耦合
- 缺少部分同步能力，无法只同步特定的 spec

### 1.2 目标
简化并增强 SpecBridge 的同步策略：
- 简化为两层结构（Epic-Task），移除 Story 层
- 明确 Task 与 Spec 的归属关系
- 支持 GitHub 双通道架构（Issue + Project）
- 支持部分同步（指定 spec）
- 自动追踪和更新 Epic 状态

### 1.3 范围
- 简化粒度控制策略（只支持 epic 和 task 两种粒度）
- Task 自动关联到所属 spec（作为 Epic）
- Epic 状态自动更新机制
- GitHub Issue 和 Project 作为独立通道
- 部分同步功能（--spec 参数）
- 配置向后兼容和迁移工具
- 完整的文档和示例

### 1.4 参考文档
- #[[file:docs/SYNC_STRATEGY.md]]

---

## 2. 功能需求

### REQ-001: 简化粒度控制策略

#### 描述
简化同步粒度，只支持 Epic 和 Task 两种粒度，移除 Story 层，降低使用复杂度。

#### 业务价值
- 降低用户理解和配置成本
- 避免层级关系混乱导致的同步错误
- 更符合实际使用场景（大多数项目不需要三层结构）

#### 验收标准
- 配置中只支持 `syncLevel: epic` 和 `syncLevel: task` 两个选项
- 移除所有 story 相关的代码和配置
- Epic 粒度：整个 spec 作为一个 Epic/Issue
- Task 粒度：每个 task 作为一个 Issue，自动关联到 spec 的 Epic
- 配置验证时，如果使用 `syncLevel: story` 则报错并提示
- 文档中明确说明只支持两种粒度

#### 优先级
High

---

### REQ-002: Epic 包含完整需求文档

#### 描述
同步 Epic 时，必须包含整个 spec 的需求文档内容（requirements.md），确保在目标平台能够清楚了解需求背景和详情。

#### 业务价值
- 在 GitHub/Jira 中直接查看完整的需求文档，无需切换到源文件
- 团队成员可以在 Issue/Epic 中了解完整的需求上下文
- 便于讨论和评审，所有信息集中在一处

#### 验收标准
- Epic 粒度同步时，Issue/Epic 的 Body/Description 包含 requirements.md 的完整内容
- 保持 Markdown 格式，确保可读性
- 如果 requirements.md 不存在，使用 spec 名称作为 Epic 标题，Body 为空或默认描述
- 支持 GitHub Issue、GitHub Project、Jira Epic 三个平台
- 内容更新时，能够同步更新 Epic 的 Body/Description
- 文档中说明 Epic 内容的来源和格式

#### 优先级
High

---

### REQ-003: Task 自动关联到 Spec Epic

#### 描述
每个 task 自动关联到其所属 spec（作为 Epic），无需手动配置关联关系。

#### 业务价值
- 简化配置，用户无需关心 task 和 requirement 的关联
- 保证同步结果的一致性和可预测性
- 同一个 spec 下的所有 task 自然归属于该 spec 的 Epic

#### 验收标准
- Task 自动继承所属 spec 的信息（spec 名称作为 Epic）
- 在 GitHub Issue 中，task 使用 Label 标记所属 spec（如 `epic:sync-strategy-enhancement`）
- 在 GitHub Project 中，task 按 spec 分组
- 在 Jira 中，task 创建在对应的 Epic 下
- 解析器能够识别 task 所属的 spec 目录
- 文档中说明 task 的自动关联机制

#### 优先级
High

---

### REQ-004: Epic 状态自动更新

#### 描述
当 spec 下所有 task 都完成时，自动更新 Epic 的状态为完成。

#### 业务价值
- 自动追踪项目进度，无需手动更新 Epic 状态
- 提供准确的项目完成度信息
- 减少手动维护工作

#### 验收标准
- 同步时计算 spec 下所有 task 的完成状态
- 如果所有 task 状态为 `done`，则更新 Epic 状态为 `Done`/`Closed`
- 如果有任何 task 未完成，Epic 状态保持为 `In Progress`/`Open`
- 支持 GitHub Issue 状态更新（open/closed）
- 支持 GitHub Project 状态字段更新
- 支持 Jira Epic 状态更新
- 在同步结果中显示 Epic 状态变更信息
- 文档中说明状态自动更新的规则

#### 优先级
High

---

### REQ-005: 部分同步支持

#### 描述
支持通过 `--spec` 参数指定同步特定的 spec，而不是同步所有 spec。

#### 业务价值
- 提高同步效率，只同步需要更新的 spec
- 避免触发不必要的 API 调用
- 支持增量开发和部署场景

#### 验收标准
- CLI 支持 `--spec <spec-name>` 参数
- 可以指定单个 spec：`specbridge sync --spec sync-strategy-enhancement`
- 可以指定多个 spec：`specbridge sync --spec spec1 --spec spec2`
- 如果不指定 `--spec`，则同步所有 spec（默认行为）
- 验证 spec 名称是否存在，不存在时给出友好提示
- 支持 `--dry-run` 预览将要同步的 spec
- 文档中提供部分同步的使用示例

#### 优先级
Medium

---

### REQ-006: GitHub 双通道架构

#### 描述
将 GitHub Issue 和 GitHub Project 作为两个独立的同步通道，用户可以选择只用其中一个，或两者结合使用。

#### 业务价值
- 用户可以根据团队习惯选择合适的工具
- Issue 专注于讨论和追踪，Project 专注于可视化管理
- 两者结合时提供最佳的项目管理体验

#### 验收标准
- 支持 `github-issue` 和 `github-project` 两种独立的 target 类型
- 支持 `github` 类型的统一配置（包含 channels 配置）
- Issue 通道支持两种 syncLevel（epic/task）
- Project 通道支持两种 syncLevel（epic/task）
- Project 通道支持 `groupBy` 配置（spec/none）
- 配置文档更新，包含所有配置示例

#### 优先级
High

---

### REQ-007: 双通道自动关联

#### 描述
当 Issue 和 Project 通道同时启用时，自动建立两者之间的关联，实现无缝集成。

#### 业务价值
- 用户无需手动关联 Issue 和 Project Item
- 从 Issue 可以直接跳转到 Project 视图
- 保持两个通道的数据一致性

#### 验收标准
- 支持 `autoLink` 配置选项
- 先同步 Issue，再同步 Project
- Project Item 自动关联到对应的 Issue
- 关联关系持久化，支持增量同步
- 错误处理：关联失败时不影响整体同步
- 文档中说明 autoLink 的工作原理

#### 优先级
Medium

---

### REQ-008: 配置向后兼容

#### 描述
保持旧配置格式的兼容性，提供平滑的迁移路径。

#### 业务价值
- 现有用户无需立即修改配置
- 提供清晰的迁移指南和工具
- 降低升级成本

#### 验收标准
- 旧配置格式（`type: github`）继续工作
- 如果配置中使用 `syncLevel: story`，给出警告并自动降级为 `task`
- 首次运行时提示用户升级配置
- 提供 `specbridge migrate-config` 命令自动迁移
- 迁移指南文档
- 配置验证时给出友好的提示信息

#### 优先级
Medium

---

### REQ-009: 文档和示例

#### 描述
提供完整的文档和示例，帮助用户理解和使用新功能。

#### 业务价值
- 降低学习成本
- 减少配置错误
- 提供最佳实践指导

#### 验收标准
- 更新 CONFIGURATION.md，包含所有新配置选项
- 更新 CLI_USAGE.md，包含新命令和选项
- 提供多个配置示例（仅 Issue、仅 Project、双通道、多平台）
- 更新 README.md，突出新功能
- 提供迁移指南（MIGRATION.md）
- 说明 Epic-Task 两层结构的设计理念

#### 优先级
Medium

---

## 3. 非功能性需求

### NFR-001: 性能要求
- 双通道同步时，Issue 和 Project 的同步应该串行执行（先 Issue 后 Project）
- 单个通道内的 API 调用应该支持批量操作
- 大量 Task 同步时应该有进度提示
- 部分同步（--spec）应该比全量同步更快

### NFR-002: 可靠性要求
- API 调用失败时应该有重试机制
- 部分失败不应该影响整体同步
- 关联失败时应该记录日志但不中断流程
- Epic 状态更新失败不应该影响 task 同步

### NFR-003: 可维护性要求
- 代码结构清晰，Issue 和 Project 管理器独立
- 充分的单元测试和集成测试
- 详细的错误日志和调试信息
- 移除所有 story 相关的遗留代码

### NFR-004: 可扩展性要求
- 适配器接口支持未来添加更多通道
- 配置格式支持未来添加更多选项
- 为状态双向同步等功能预留扩展点
- Epic 状态更新机制可扩展到其他平台

---

## 4. 约束条件

### 4.1 技术约束
- 必须保持与现有适配器接口的兼容性
- 必须支持 Node.js 18+ 环境
- GitHub API 调用需遵守速率限制（5000 请求/小时）
- Project V2 API 仅支持 GraphQL

### 4.2 业务约束
- 旧配置格式必须继续工作，不能破坏现有用户的使用
- 迁移过程必须是可选的，不能强制用户立即升级
- 所有 API 凭证必须通过环境变量管理，不能存储在配置文件中
- 移除 story 层不能影响已同步的数据

### 4.3 时间约束
- 预估总开发时间：80-100 小时（简化后减少约 20 小时）
- 核心功能（P0）优先完成
- 文档和示例与功能开发同步进行

---

## 5. 依赖关系

### 5.1 外部依赖
- GitHub REST API v3（Issue 管理）
- GitHub GraphQL API v4（Project 管理）
- Jira REST API v3（Epic 和 Task 管理）
- @octokit/rest 库
- @octokit/graphql 库

### 5.2 内部依赖
- 现有的 SourceAdapter 接口
- 现有的 TargetAdapter 接口
- 现有的配置解析逻辑
- 现有的同步引擎

---

## 6. 风险和缓解措施

### 6.1 技术风险

**风险**: 移除 story 层可能影响已有用户
- **影响**: 用户升级后同步行为改变
- **概率**: 中
- **缓解**: 提供详细的迁移指南，自动降级 story 配置为 task

**风险**: Epic 状态自动更新可能与手动更新冲突
- **影响**: 用户手动修改的状态被自动覆盖
- **概率**: 低
- **缓解**: 提供配置选项禁用自动更新，文档中说明行为

**风险**: GitHub Project V2 API 学习曲线陡峭
- **影响**: 开发进度延迟
- **概率**: 中
- **缓解**: 提前研究 API 文档，参考官方示例代码

**风险**: 大量 Task 同步可能触发 API 速率限制
- **影响**: 同步失败或速度缓慢
- **概率**: 高
- **缓解**: 实现并发控制和指数退避重试机制

### 6.2 业务风险

**风险**: 用户不理解新的简化结构
- **影响**: 配置错误导致同步失败
- **概率**: 低
- **缓解**: 提供详细文档、配置示例和友好的错误提示

**风险**: 迁移过程中数据丢失
- **影响**: 用户数据损坏
- **概率**: 低
- **缓解**: 迁移前自动备份配置文件，提供回滚机制

---

## 7. 验收标准总结

### 7.1 功能完整性
- 所有 9 个功能需求的验收标准全部满足
- 所有 4 个非功能性需求得到实现
- 端到端测试覆盖所有主要场景

### 7.2 质量标准
- 单元测试覆盖率 > 80%
- 所有集成测试通过
- 代码通过 ESLint 和 Prettier 检查
- 无已知的 Critical 或 High 级别 Bug
- 所有 story 相关代码已清理

### 7.3 文档完整性
- CONFIGURATION.md 更新完成
- CLI_USAGE.md 更新完成
- MIGRATION.md 创建完成
- README.md 更新完成
- 至少 4 个配置示例文件

### 7.4 用户体验
- 配置迁移命令可用且经过测试
- CLI 提供清晰的进度提示
- 错误消息友好且可操作
- 支持 --dry-run 预览同步结果
- 支持 --spec 部分同步

---

## 8. 与旧需求的对比

### 移除的功能
- ❌ Story 粒度同步
- ❌ Task 多需求归属（简化为自动关联到 spec）
- ❌ 复杂的需求关联逻辑

### 新增的功能
- ✅ Epic 状态自动更新
- ✅ 部分同步（--spec 参数）
- ✅ 更简单的两层结构

### 保留的功能
- ✅ GitHub 双通道架构
- ✅ 双通道自动关联
- ✅ 粒度控制（简化为两种）
- ✅ 配置向后兼容

---

## 9. 未来扩展

以下功能不在当前范围内，但为未来预留扩展点：

### 9.1 状态双向同步
- 从平台同步状态变更回 Spec 文件
- 支持状态映射配置

### 9.2 评论同步
- 同步 Spec 中的评论到 Issue/Task
- 同步平台评论回 Spec

### 9.3 依赖关系可视化
- 在 GitHub Project 中展示 Task 依赖关系
- 支持 Gantt 图视图

### 9.4 自定义字段映射
- 允许用户自定义字段映射规则
- 支持复杂的字段转换逻辑

### 9.5 进度追踪增强
- Epic 进度百分比显示
- 预估完成时间计算
- 燃尽图生成
