<script setup>
  import AvatarList from '@/components/avatar/AvatarList.vue';
  import { UploadOutlined } from '@ant-design/icons-vue';
  import { reactive } from 'vue';
  import personalBg from '@/assets/personal-bg.png';
  import face1 from '@/assets/avatar/face-1.jpg';
  import face2 from '@/assets/avatar/face-2.jpg';
  import face3 from '@/assets/avatar/face-3.jpg';
  import face4 from '@/assets/avatar/face-4.jpg';
  const projectList = reactive([
    {
      title: 'Modern',
      no: 1,
      description:
        'As Uber works through a huge amount of internal management turmoil.',
      img: personalBg,
      members: [
        { nickname: 'jack', avatar: face1 },
        { nickname: 'jack', avatar: face2 },
        { nickname: 'jack', avatar: face3 },
        { nickname: 'jack', avatar: face4 },
      ],
    },
    {
      title: 'Modern',
      no: 2,
      description:
        'As Uber works through a huge amount of internal management turmoil.',
      img: personalBg,
      members: [
        { nickname: 'jack', avatar: face1 },
        { nickname: 'jack', avatar: face2 },
        { nickname: 'jack', avatar: face3 },
        { nickname: 'jack', avatar: face4 },
      ],
    },
    {
      title: 'Modern',
      no: 3,
      description:
        'As Uber works through a huge amount of internal management turmoil.',
      img: personalBg,
      members: [
        { nickname: 'jack', avatar: face1 },
        { nickname: 'jack', avatar: face2 },
        { nickname: 'jack', avatar: face3 },
        { nickname: 'jack', avatar: face4 },
      ],
    },
  ]);
  const avatarList = [
    { nickname: 'jack', avatar: face1 },
    { nickname: 'jack', avatar: face2 },
    { nickname: 'jack', avatar: face3 },
    { nickname: 'jack', avatar: face4 },
  ];
</script>
<template>
  <div class="projects rounded-xl">
    <div class="mb-base">
      <div class="font-semibold text-lg">Projects</div>
      <div class="text-subtext text-sm">Architects design houses</div>
    </div>
    <div class="project-list flex items-stretch justify-between">
      <a-card
        class="project flex-1 rounded-xl shadow-lg"
        :bordered="false"
        v-for="item in projectList"
      >
        <template #cover>
          <img class="w-full h-48" :src="item.img" />
        </template>
        <a-card-meta :title="item.title" :description="`Project #${item.no}`">
        </a-card-meta>
        <div class="mt-4 text-subtext text-sm">
          {{ item.description }}
        </div>
        <div class="footer mt-8 flex justify-between items-center">
          <a-button>VIEW PROJECT</a-button>
          <AvatarList :source="item.members" :size="24" />
        </div>
      </a-card>
      <a-button
        class="flex-1 ml-lg rounded-lg text-md font-semibold shadow-lg"
        style="height: unset; border-radius: 0.5rem"
        type="dashed"
      >
        <UploadOutlined class="text-lg" />
        <br />
        Upload New Project
      </a-button>
    </div>
  </div>
</template>
<style lang="less" scoped>
  :deep(.ant-card) {
    &-head {
      @apply border-b-0;

      &-title {
        @apply pb-0;
      }
    }
  }

  .projects {
    .project-list {
      .project {
        &:not(:first-child) {
          @apply ml-lg;
        }

        :deep(.ant-card) {
          &-cover {
            img {
              @apply rounded-t-lg;
            }
          }

          &-body {
          }

          &-meta {
            &-detail {
              @apply flex flex-col-reverse;
            }

            &-description {
              @apply font-semibold;
            }

            &-title {
              @apply text-xl mb-0 mt-2;
            }
          }
        }
      }
    }
  }
</style>
