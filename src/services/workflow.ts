/**
 * ComfyUI 工作流模板
 * 基于用户提供的实际工作流格式
 */

import { FULL_CHARACTER_DB } from '../data/characters'
import { useCharacterStore } from '../stores/characterStore'

// 工作流类型
export type WorkflowType = 'standard' | 'zimage'

export interface WorkflowParams {
    checkpoint: string
    positivePrompt: string
    negativePrompt: string
    width: number
    height: number
    batchSize: number
    steps: number
    cfgScale: number
    sampler: string
    scheduler: string
    seed: number
    loras?: Array<{ name: string; weight: number }>
    filenamePrefix?: string // 自定义文件名前缀（包含路径）
}

export interface ZimageWorkflowParams extends Omit<WorkflowParams, 'checkpoint'> {
    unetName: string
    clipName: string
    vaeName: string
}

/**
 * 生成标准文生图工作流 (API 格式)
 * 基于用户提供的 ComfyUI 工作流结构
 * @param params 工作流参数
 * @returns ComfyUI API 格式的工作流 JSON
 */
export function createTextToImageWorkflow(params: WorkflowParams): Record<string, any> {
    const {
        checkpoint,
        positivePrompt,
        negativePrompt,
        width,
        height,
        batchSize,
        steps,
        cfgScale,
        sampler,
        scheduler,
        seed,
        loras = [],
        filenamePrefix = "NexusStudio"
    } = params

    // 计算实际 seed（-1 表示随机）
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 2 ** 53) : seed

    // 基础工作流节点 - 参考用户的 ComfyUI 工作流
    const workflow: Record<string, any> = {
        // ... (保持省略的节点代码不变，我只修改 SaveImage)
        // 节点 4: 加载 Checkpoint 模型
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": checkpoint
            }
        },

        // 节点 6: CLIP 文本编码 (正向提示词)
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": positivePrompt,
                "clip": ["4", 1]  // 从节点4获取 CLIP (索引1)
            }
        },

        // 节点 7: CLIP 文本编码 (负向提示词)
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": negativePrompt,
                "clip": ["4", 1]  // 从节点4获取 CLIP (索引1)
            }
        },

        // 节点 5: 空白潜空间
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": batchSize
            }
        },

        // 节点 3: KSampler
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": actualSeed,
                "steps": steps,
                "cfg": cfgScale,
                "sampler_name": sampler,
                "scheduler": scheduler,
                "denoise": 1,
                "model": ["4", 0],      // 从节点4获取模型 (索引0)
                "positive": ["6", 0],   // 正向条件
                "negative": ["7", 0],   // 负向条件
                "latent_image": ["5", 0] // 潜空间图像
            }
        },

        // 节点 8: VAE 解码
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["3", 0],    // 从 KSampler 获取
                "vae": ["4", 2]         // 从节点4获取 VAE (索引2)
            }
        },

        // 节点 9: 保存图像
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": filenamePrefix,
                "images": ["8", 0]
            }
        }
    }

    // 如果有 LoRA，需要在 Checkpoint 之后插入 LoRA 加载节点
    if (loras.length > 0) {
        let lastModelOutput: [string, number] = ["4", 0]
        let lastClipOutput: [string, number] = ["4", 1]

        loras.forEach((lora, index) => {
            const nodeId = `lora_${index + 10}` // 从 10 开始避免 ID 冲突
            workflow[nodeId] = {
                "class_type": "LoraLoader",
                "inputs": {
                    "lora_name": lora.name,
                    "strength_model": lora.weight,
                    "strength_clip": lora.weight,
                    "model": lastModelOutput,
                    "clip": lastClipOutput
                }
            }
            lastModelOutput = [nodeId, 0]
            lastClipOutput = [nodeId, 1]
        })

        // 更新后续节点的模型和 CLIP 输入
        workflow["6"]["inputs"]["clip"] = lastClipOutput
        workflow["7"]["inputs"]["clip"] = lastClipOutput
        workflow["3"]["inputs"]["model"] = lastModelOutput
    }

    return workflow
}

/**
 * 创建带角色标签的工作流
 * @param baseParams 基础参数
 * @param characterTags 角色标签数组 (英文名，将添加到正向提示词)
 * @param characterLoras 角色对应的 LoRA 映射（可选）
 */
export function createCharacterWorkflow(
    baseParams: WorkflowParams,
    characterTags: string[],
    characterLoras: Record<string, { name: string; weight: number }> = {}
): Record<string, any> {
    const characterPromptsStore = useCharacterStore.getState().characterPrompts
    const extraPrompts = characterTags
        .flatMap(tag => {
            const cp = characterPromptsStore[tag]
            if (!cp) return []
            const promptList = Array.isArray(cp) ? cp : [cp as any]
            return promptList.filter((p: any) => p.enabled && p.prompt).map((p: any) => p.prompt)
        })
        .filter(Boolean)

    // 将角色标签添加到正向提示词开头
    const enhancedPrompt = [
        ...characterTags,
        ...extraPrompts,
        baseParams.positivePrompt
    ].filter(Boolean).join(', ')

    // 收集角色对应的 LoRA
    const loras = characterTags
        .map(tag => characterLoras[tag])
        .filter(Boolean) as Array<{ name: string; weight: number }>

    // 合并用户手动指定的 LoRA
    if (baseParams.loras) {
        loras.push(...baseParams.loras)
    }

    // 生成输出路径: YYYYMMDD/角色名(处理后)/NexusStudio
    let filenamePrefix = baseParams.filenamePrefix || "NexusStudio"

    if (characterTags.length > 0) {
        // 查找第一个角色的中文名
        const firstCharTag = characterTags[0]
        const charInfo = FULL_CHARACTER_DB.find(c => c.value === firstCharTag) ||
            useCharacterStore.getState().addedCharacters.find((c: any) => c.value === firstCharTag)

        if (charInfo) {
            // 获取当前日期 YYYYMMDD
            const now = new Date()
            const dateStr = now.getFullYear() +
                (now.getMonth() + 1).toString().padStart(2, '0') +
                now.getDate().toString().padStart(2, '0')

            // 处理角色名：保留中文名和括号，仅替换文件系统非法字符
            // 非法字符: \ / : * ? " < > |
            let processedName = charInfo.key.replace(/[\\/:*?"<>|]/g, '_')

            // 构建路径
            filenamePrefix = `${dateStr}/${processedName}/NexusStudio`
        }
    }

    return createTextToImageWorkflow({
        ...baseParams,
        positivePrompt: enhancedPrompt,
        loras,
        filenamePrefix
    })
}

/**
 * 将 API 格式转换为 ComfyUI 可导入的完整工作流格式
 * （包含节点位置等元数据）
 */
export function convertToFullWorkflow(apiWorkflow: Record<string, any>): any {
    const nodes: any[] = []
    const links: any[][] = []

    // 这是一个简化版本，实际使用时 ComfyUI 会自动处理
    Object.entries(apiWorkflow).forEach(([nodeId, node]) => {
        nodes.push({
            id: parseInt(nodeId) || nodeId,
            type: node.class_type,
            pos: [0, 0],
            size: [200, 100],
            flags: {},
            order: 0,
            mode: 0,
            inputs: [],
            outputs: [],
            properties: {},
            widgets_values: Object.values(node.inputs).filter(v =>
                !Array.isArray(v) // 非链接的值
            )
        })
    })

    return {
        nodes,
        links,
        groups: [],
        config: {},
        extra: {},
        version: 0.4
    }
}

/**
 * 创建 zimage 工作流 (使用独立的 UNET/CLIP/VAE 加载器)
 * 基于用户提供的 z_image_turbo_example 工作流
 */
export function createZimageWorkflow(params: ZimageWorkflowParams): Record<string, any> {
    const {
        unetName,
        clipName,
        vaeName,
        positivePrompt,
        negativePrompt,
        width,
        height,
        batchSize,
        steps,
        cfgScale,
        sampler,
        scheduler,
        seed,
        loras = [],
        filenamePrefix = "NexusStudio"
    } = params

    // 计算实际 seed（-1 表示随机）
    const actualSeed = seed === -1 ? Math.floor(Math.random() * 2 ** 53) : seed

    const workflow: Record<string, any> = {
        // 节点 16: UNET 加载器
        "16": {
            "class_type": "UNETLoader",
            "inputs": {
                "unet_name": unetName,
                "weight_dtype": "default"
            }
        },

        // 节点 18: CLIP 加载器
        "18": {
            "class_type": "CLIPLoader",
            "inputs": {
                "clip_name": clipName,
                "type": "qwen_image",
                "device": "default"
            }
        },

        // 节点 17: VAE 加载器
        "17": {
            "class_type": "VAELoader",
            "inputs": {
                "vae_name": vaeName
            }
        },

        // 节点 6: CLIP 文本编码 (正向提示词)
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": positivePrompt,
                "clip": ["18", 0]
            }
        },

        // 节点 7: CLIP 文本编码 (负向提示词)
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": negativePrompt,
                "clip": ["18", 0]
            }
        },

        // 节点 13: 空白 SD3 潜空间
        "13": {
            "class_type": "EmptySD3LatentImage",
            "inputs": {
                "width": width,
                "height": height,
                "batch_size": batchSize
            }
        },

        // 节点 3: KSampler
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": actualSeed,
                "steps": steps,
                "cfg": cfgScale,
                "sampler_name": sampler,
                "scheduler": scheduler,
                "denoise": 1,
                "model": ["16", 0],      // 从 UNETLoader 获取模型
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["13", 0]
            }
        },

        // 节点 8: VAE 解码
        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["3", 0],
                "vae": ["17", 0]
            }
        },

        // 节点 9: 保存图像
        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": filenamePrefix,
                "images": ["8", 0]
            }
        }
    }

    // 如果有 LoRA，需要在模型加载之后插入 LoRA 加载节点
    if (loras.length > 0) {
        let lastModelOutput: [string, number] = ["16", 0] // 初始模型出自 UNETLoader (节点 16)
        let lastClipOutput: [string, number] = ["18", 0]  // 初始 CLIP 出自 CLIPLoader (节点 18)

        loras.forEach((lora, index) => {
            const nodeId = `lora_${index + 20}` // 从 20 开始避免跟 zimage 的基础节点冲突
            workflow[nodeId] = {
                "class_type": "LoraLoader",
                "inputs": {
                    "lora_name": lora.name,
                    "strength_model": lora.weight,
                    "strength_clip": lora.weight,
                    "model": lastModelOutput,
                    "clip": lastClipOutput
                }
            }
            lastModelOutput = [nodeId, 0]
            lastClipOutput = [nodeId, 1]
        })

        // 更新后续节点的模型和 CLIP 输入
        workflow["6"]["inputs"]["clip"] = lastClipOutput
        workflow["7"]["inputs"]["clip"] = lastClipOutput
        workflow["3"]["inputs"]["model"] = lastModelOutput
    }

    return workflow
}

/**
 * 创建带角色标签的 zimage 工作流
 */
export function createZimageCharacterWorkflow(
    baseParams: ZimageWorkflowParams,
    characterTags: string[],
    characterLoras: Record<string, { name: string; weight: number }> = {}
): Record<string, any> {
    // 收集角色对应的 LoRA
    const loras = characterTags
        .map(tag => characterLoras?.[tag])
        .filter(Boolean) as Array<{ name: string; weight: number }>

    // 合并用户手动指定的 LoRA
    if (baseParams.loras) {
        loras.push(...baseParams.loras)
    }

    const characterPromptsStore = useCharacterStore.getState().characterPrompts
    const extraPrompts = characterTags
        .flatMap(tag => {
            const cp = characterPromptsStore[tag]
            if (!cp) return []
            const promptList = Array.isArray(cp) ? cp : [cp as any]
            return promptList.filter((p: any) => p.enabled && p.prompt).map((p: any) => p.prompt)
        })
        .filter(Boolean)

    // 将角色标签添加到正向提示词开头
    const enhancedPrompt = [
        ...characterTags,
        ...extraPrompts,
        baseParams.positivePrompt
    ].filter(Boolean).join(', ')

    // 生成输出路径
    let filenamePrefix = baseParams.filenamePrefix || "NexusStudio"

    if (characterTags.length > 0) {
        const firstCharTag = characterTags[0]
        const charInfo = FULL_CHARACTER_DB.find(c => c.value === firstCharTag) ||
            useCharacterStore.getState().addedCharacters.find((c: any) => c.value === firstCharTag)

        if (charInfo) {
            const now = new Date()
            const dateStr = now.getFullYear() +
                (now.getMonth() + 1).toString().padStart(2, '0') +
                now.getDate().toString().padStart(2, '0')

            let processedName = charInfo.key.replace(/[\\/:*?"<>|]/g, '_')
            filenamePrefix = `${dateStr}/${processedName}/NexusStudio`
        }
    }

    return createZimageWorkflow({
        ...baseParams,
        positivePrompt: enhancedPrompt,
        loras: loras,
        filenamePrefix
    })
}
